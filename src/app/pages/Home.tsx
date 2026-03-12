import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Share2, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { logProductEvent } from "@/lib/productEvents";
import { isEventUpcomingOrOngoing } from "@/lib/eventDates";
import { formatRetrySeconds, getRateLimitStatus } from "@/lib/rateLimit";
import { featureFlags } from "@/lib/featureFlags";
import { rankMoveCandidates } from "@/lib/theMove";
import { TheMoveBadge } from "@/app/components/TheMoveBadge";
import { MakeTheMoveHero, TheMoveHero } from "@/app/components/TheMoveHero";
import { ActivationChecklist } from "@/app/components/ActivationChecklist";
import { shareInviteLink } from "@/lib/inviteSharing";
import { isEventVisible } from "@/lib/eventVisibility";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  event_source?: string | null;
  moderation_status?: string | null;
};

type AttendeeRow = {
  event_id: string;
  user_id: string;
  created_at?: string | null;
  profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const coverStyle = {
  background:
    "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
} as const;
function formatDateRange(startValue?: string | null, endValue?: string | null) {
  if (!startValue) return "Date TBD";
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return "Date TBD";

  const startText = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!endValue) return startText;

  const end = new Date(endValue);
  if (Number.isNaN(end.getTime())) return startText;

  const endText = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startText} - ${endText}`;
}

function uniqKeepOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function displayName(
  profile?: { display_name: string | null; username: string | null } | null
): string {
  const d = profile?.display_name?.trim();
  if (d) return d;
  const u = profile?.username?.trim();
  if (u) return u;
  return "Friend";
}

function relativeRsvp(ts?: string | null): string {
  if (!ts) return "";
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 0) return "";
  if (mins < 10) return "just RSVPed";
  if (mins < 60) return `RSVPed ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `RSVPed ${hrs}h ago`;
  return "";
}

function friendClusterText(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is going`;
  if (names.length === 2) return `${names[0]}, ${names[1]} are going`;
  return `${names[0]}, ${names[1]} + ${names.length - 2} friends`;
}

function AvatarStack({
  urls,
  total,
  label,
}: {
  urls: string[];
  total: number;
  label?: string;
}) {
  const show = urls.slice(0, 5);
  const extra = Math.max(0, total - show.length);

  if (total <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {show.map((u, idx) => (
          <div
            key={`${u}-${idx}`}
            className="w-7 h-7 rounded-full border border-black bg-zinc-800 overflow-hidden shadow-sm"
            title={label}
          >
            {u ? (
              <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-zinc-800" />
            )}
          </div>
        ))}
        {extra > 0 ? (
          <div className="w-7 h-7 rounded-full border border-black bg-white/10 text-[11px] font-semibold text-white/80 flex items-center justify-center">
            +{extra}
          </div>
        ) : null}
      </div>

      {label ? <div className="text-xs text-zinc-400">{label}</div> : null}
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewerId, setViewerId] = useState<string | null>(null);

  const [myGoing, setMyGoing] = useState<Set<string>>(new Set());

  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [friendAvatarsByEvent, setFriendAvatarsByEvent] = useState<Record<string, string[]>>({});
  const [friendNamesByEvent, setFriendNamesByEvent] = useState<Record<string, string[]>>({});
  const [recentFriendCueByEvent, setRecentFriendCueByEvent] = useState<Record<string, string>>({});
  const [friendCounts, setFriendCounts] = useState<Record<string, number>>({});
  const [othersCounts, setOthersCounts] = useState<Record<string, number>>({});
  const [othersAvatarsByEvent, setOthersAvatarsByEvent] = useState<Record<string, string[]>>({});
  const [viewerAvatarByEvent, setViewerAvatarByEvent] = useState<Record<string, string>>({});
  const [recentCountsByEvent, setRecentCountsByEvent] = useState<Record<string, number>>({});

  const [othersAvatarPoolByEvent, setOthersAvatarPoolByEvent] = useState<Record<string, string[]>>({
  });

  const [badThumbs, setBadThumbs] = useState<Set<string>>(new Set());

  const [workingByEvent, setWorkingByEvent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void load();
  }, []);

  const resetSocialState = () => {
    setFriendIds(new Set());
    setMyGoing(new Set());
    setFriendAvatarsByEvent({});
    setFriendNamesByEvent({});
    setRecentFriendCueByEvent({});
    setFriendCounts({});
    setOthersCounts({});
    setOthersAvatarsByEvent({});
    setViewerAvatarByEvent({});
    setOthersAvatarPoolByEvent({});
    setRecentCountsByEvent({});
  };

  const load = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const uid = session?.user?.id ?? null;
    setViewerId(uid);

    if (!uid) {
      setEvents([]);
      resetSocialState();
      setLoading(false);
      return;
    }

    const nowTs = Date.now();
    const { data: fids, error: fErr } = await supabase.rpc("get_friend_ids");
    if (fErr) console.error(fErr);
    const fset = new Set<string>((fids ?? []) as string[]);
    setFriendIds(fset);

    const socialUserIds = uniqKeepOrder([uid, ...Array.from(fset)]);
    if (socialUserIds.length > 0) {
      const { data, error } = await supabase
        .from("attendees")
        .select("event_id,user_id,created_at, profiles(display_name,username,avatar_url)")
        .in("user_id", socialUserIds);

      if (error) {
        console.error(error);
        setEvents([]);
        resetSocialState();
        setLoading(false);
        return;
      }

      const socialAttendees = (data ?? []) as AttendeeRow[];
      const socialEventIds = uniqKeepOrder(
        socialAttendees.map((row) => row.event_id).filter(Boolean)
      );

      if (socialEventIds.length === 0) {
        setEvents([]);
        resetSocialState();
        setFriendIds(fset);
        setLoading(false);
        return;
      }

      const [{ data: eventData, error: eventErr }, { data: eventAttData, error: eventAttErr }] =
        await Promise.all([
          supabase
            .from("events")
            .select("id,title,location,event_date,event_end_date,image_url,event_source,moderation_status")
            .in("id", socialEventIds)
            .order("event_date", { ascending: true }),
          supabase
            .from("attendees")
            .select("event_id,user_id,created_at, profiles(display_name,username,avatar_url)")
            .in("event_id", socialEventIds),
        ]);

      if (eventErr) {
        console.error(eventErr);
        toast.error("Failed to load events");
        setEvents([]);
        resetSocialState();
        setLoading(false);
        return;
      }

      if (eventAttErr) {
        console.error(eventAttErr);
        setEvents([]);
        resetSocialState();
        setLoading(false);
        return;
      }

      const rows = ((eventData ?? []) as EventRow[]).filter(
        (e) => isEventVisible(e) && isEventUpcomingOrOngoing(e, nowTs)
      );
      const visibleEventIds = new Set(rows.map((row) => row.id));
      setEvents(rows);

      const attendees = ((eventAttData ?? []) as AttendeeRow[]).filter((row) =>
        visibleEventIds.has(row.event_id)
      );

      const mySet = new Set<string>();
      for (const a of attendees) {
        if (a.user_id === uid) mySet.add(a.event_id);
      }
      setMyGoing(mySet);

      const friendCountsMap: Record<string, number> = {};
      const friendAvatarsMap: Record<string, string[]> = {};
      const friendNamesMap: Record<string, string[]> = {};
      const recentFriendMap: Record<string, string> = {};
      const othersCountsMap: Record<string, number> = {};
      const othersAvatarsMap: Record<string, string[]> = {};
      const othersPoolMap: Record<string, string[]> = {};
      const viewerAvatarMap: Record<string, string> = {};
      const recentCountsMap: Record<string, number> = {};

      const friendTmp: Record<string, string[]> = {};
      const friendNameTmp: Record<string, string[]> = {};
      const friendRecentTmp: Record<string, { name: string; createdAt: string }[]> = {};
      const othersTmp: Record<string, string[]> = {};

      for (const a of attendees) {
        const eid = a.event_id;
        if (!eid) continue;

        const isViewer = a.user_id === uid;
        const isFriend = fset.has(a.user_id);
        const av = a.profiles?.avatar_url ?? "";
        const name = displayName(a.profiles);

        if (isFriend) {
          friendCountsMap[eid] = (friendCountsMap[eid] ?? 0) + 1;
          if (av) (friendTmp[eid] ||= []).push(av);
          (friendNameTmp[eid] ||= []).push(name);
          if (a.created_at) {
            (friendRecentTmp[eid] ||= []).push({ name, createdAt: a.created_at });
          }
          continue;
        }

        if (!isViewer) {
          othersCountsMap[eid] = (othersCountsMap[eid] ?? 0) + 1;
          if (av) (othersTmp[eid] ||= []).push(av);
        } else if (av) {
          viewerAvatarMap[eid] = av;
        }

        if (a.created_at) {
          const createdAt = new Date(a.created_at).getTime();
          if (!Number.isNaN(createdAt) && nowTs - createdAt <= 6 * 60 * 60 * 1000) {
            recentCountsMap[eid] = (recentCountsMap[eid] ?? 0) + 1;
          }
        }
      }

      for (const eid of Object.keys(friendCountsMap)) {
        friendAvatarsMap[eid] = uniqKeepOrder(friendTmp[eid] ?? []).slice(0, 5);
        friendNamesMap[eid] = uniqKeepOrder(friendNameTmp[eid] ?? []).slice(0, 8);
        const recent = (friendRecentTmp[eid] ?? [])
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (recent) {
          const rel = relativeRsvp(recent.createdAt);
          if (rel) recentFriendMap[eid] = `${recent.name} ${rel}`;
        }
      }

      for (const eid of Object.keys(othersCountsMap)) {
        const pool = uniqKeepOrder(othersTmp[eid] ?? []);
        othersPoolMap[eid] = pool;
        if (mySet.has(eid)) othersAvatarsMap[eid] = pool.slice(0, 5);
      }

      setFriendCounts(friendCountsMap);
      setFriendAvatarsByEvent(friendAvatarsMap);
      setFriendNamesByEvent(friendNamesMap);
      setRecentFriendCueByEvent(recentFriendMap);
      setOthersCounts(othersCountsMap);
      setViewerAvatarByEvent(viewerAvatarMap);
      setOthersAvatarPoolByEvent(othersPoolMap);
      setOthersAvatarsByEvent(othersAvatarsMap);
      setRecentCountsByEvent(recentCountsMap);

      setLoading(false);
      return;
    }
    setEvents([]);
    resetSocialState();
    setFriendIds(fset);
    setLoading(false);
  };

  const moveRanking = useMemo(
    () =>
      rankMoveCandidates(
        events.map((event) => {
          const viewerGoing = myGoing.has(event.id) ? 1 : 0;
          return {
            id: event.id,
            title: event.title,
            startAt: event.event_date,
            totalRsvps:
              (friendCounts[event.id] ?? 0) + (othersCounts[event.id] ?? 0) + viewerGoing,
            friendRsvps: friendCounts[event.id] ?? 0,
            recentRsvps: recentCountsByEvent[event.id] ?? 0,
            quality: event.image_url ? 1 : 0.92,
          };
        }),
        "circle"
      ),
    [events, friendCounts, myGoing, othersCounts, recentCountsByEvent]
  );

  const feedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aMove = moveRanking.signalsById[a.id]?.score ?? -999;
      const bMove = moveRanking.signalsById[b.id]?.score ?? -999;
      const aFriends = friendCounts[a.id] ?? 0;
      const bFriends = friendCounts[b.id] ?? 0;
      const aTs = new Date(a.event_date ?? 0).getTime();
      const bTs = new Date(b.event_date ?? 0).getTime();
      if (aMove !== bMove) return bMove - aMove;
      if (aFriends !== bFriends) return bFriends - aFriends;
      if (aTs !== bTs) return aTs - bTs;
      return (othersCounts[b.id] ?? 0) - (othersCounts[a.id] ?? 0);
    });
  }, [events, friendCounts, moveRanking.signalsById, othersCounts]);
  const hasAtLeastOneFriend = friendIds.size > 0;
  const topMoveSignal = moveRanking.topSignal;
  const topMoveEvent = useMemo(
    () => (topMoveSignal ? events.find((event) => event.id === topMoveSignal.eventId) ?? null : null),
    [events, topMoveSignal]
  );

  const applyLocalRsvpChange = (eventId: string, nextGoing: boolean) => {
    setMyGoing((prev) => {
      const n = new Set(prev);
      if (nextGoing) n.add(eventId);
      else n.delete(eventId);
      return n;
    });

    setOthersCounts((prev) => {
      const cur = prev[eventId] ?? 0;
      const next = nextGoing ? Math.max(0, cur - 1) : cur + 1;
      return { ...prev, [eventId]: next };
    });

    setOthersAvatarsByEvent((prev) => {
      const pool = othersAvatarPoolByEvent[eventId] ?? [];
      const next = { ...prev };
      if (nextGoing) next[eventId] = pool.slice(0, 5);
      else delete next[eventId];
      return next;
    });
  };

  const toggleRsvp = async (eventId: string) => {
    if (featureFlags.killSwitchRsvpWrites) {
      toast.error("RSVP is temporarily unavailable");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast.error("Sign in to RSVP");
      navigate("/login");
      return;
    }

    const uid = session.user.id;
    if (workingByEvent[eventId]) return;

    const rl = getRateLimitStatus(`rsvp_home:${uid}:${eventId}`, 2000);
    if (!rl.allowed) {
      const seconds = formatRetrySeconds(rl.retryAfterMs);
      toast.error(`Please wait ${seconds}s before trying again.`);
      track("rsvp_rate_limited", { source: "home", eventId, seconds });
      return;
    }

    const currentlyGoing = myGoing.has(eventId);
    const nextGoing = !currentlyGoing;

    setWorkingByEvent((m) => ({ ...m, [eventId]: true }));
    applyLocalRsvpChange(eventId, nextGoing);

    try {
        if (nextGoing) {
        const { error } = await supabase.from("attendees").insert({
          event_id: eventId,
          user_id: uid,
          rsvp_source: "home",
        });
        if (error) throw error;
          toast.success("You're going 🎉");
        track("rsvp_updated", { source: "home", action: "add", eventId });
        track("rsvp_success", { source: "home", action: "add", eventId });
      } else {
        const { error } = await supabase
          .from("attendees")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", uid);
        if (error) throw error;
          toast.message("RSVP removed");
        track("rsvp_updated", { source: "home", action: "remove", eventId });
        track("rsvp_success", { source: "home", action: "remove", eventId });
      }
    } catch (e: any) {
      console.error(e);
      applyLocalRsvpChange(eventId, currentlyGoing);
      toast.error(e?.message ?? "Failed to update RSVP");
      track("rsvp_failed", {
        source: "home",
        action: nextGoing ? "add" : "remove",
        eventId,
        message: e?.message ?? "unknown_error",
      });
    } finally {
      setWorkingByEvent((m) => ({ ...m, [eventId]: false }));
    }
  };

  const handleShareInvite = async (eventId: string, eventTitle: string) => {
    if (featureFlags.killSwitchInvites) {
      toast.error("Invites are temporarily unavailable");
      return;
    }

    track("invite_cta_clicked", {
      source: "share_link",
      placement: "home_feed_card",
      eventId,
    });

    try {
      const channel = await shareInviteLink({
        eventId,
        eventTitle,
        source: "share_link",
      });
      if (channel === "share_canceled") return;
      toast.success(channel === "copy_fallback" ? "Invite link copied" : "Invite shared");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not share invite");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-6">Loading events...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="relative h-48" style={coverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
        <div className="relative px-5 pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
              <p className="text-zinc-400 mt-1">Discover events and see who is going.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {viewerId ? <ActivationChecklist /> : null}

        {topMoveSignal && topMoveEvent ? (
          <TheMoveHero
            eventId={topMoveEvent.id}
            title={topMoveEvent.title}
            context="Your circle tonight"
            meta={topMoveEvent.location ?? "Location TBD"}
            signal={topMoveSignal}
            source="home"
          />
        ) : (
          <MakeTheMoveHero
            title="Nothing has fully broken through yet"
            body="Your people have not crowned the night yet. Scan what is close, be early, and make the move yourself."
            ctaLabel="Open Explore"
            to="/explore"
            source="home"
          />
        )}

        {viewerId && !hasAtLeastOneFriend && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/55 p-4">
            <div className="text-sm font-semibold text-zinc-100">Whozin gets sharper with your people</div>
            <div className="mt-1 text-xs text-zinc-400">
              Add a few friends to sharpen the feed, surface better momentum, and make nights easier to call.
            </div>
            <Link
              to="/friends"
              className="mt-3 inline-flex items-center rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/15"
            >
              Find friends
            </Link>
          </div>
        )}

        {feedEvents.map((event) => {
          const hasImage = !!event.image_url && event.image_url.trim().length > 0;
          const thumbOk = !badThumbs.has(event.id);
          const showThumb = hasImage && thumbOk;

          const going = myGoing.has(event.id);
          const working = !!workingByEvent[event.id];

          const fCount = friendCounts[event.id] ?? 0;
          const oCount = othersCounts[event.id] ?? 0;
          const totalGoing = fCount + oCount + (going ? 1 : 0);

          const friendUrls = friendAvatarsByEvent[event.id] ?? [];
          const friendNames = friendNamesByEvent[event.id] ?? [];
          const friendCue = recentFriendCueByEvent[event.id] ?? "";
          const othersUrls = othersAvatarsByEvent[event.id] ?? [];
          const viewerAvatar = viewerAvatarByEvent[event.id] ?? "";
          const socialUrls = going
            ? [viewerAvatar, ...friendUrls, ...othersUrls].filter(Boolean)
            : [...friendUrls, ...othersUrls].filter(Boolean);
          const socialLabel = friendClusterText(friendNames);

          return (
            <Link
              key={event.id}
              to={`/event/${event.id}?src=home`}
              onClick={() => {
                track("event_view", { source: "home_feed", eventId: event.id });
                if (moveRanking.signalsById[event.id]) {
                  track("the_move_click", {
                    source: "home",
                    placement: "home_feed_card",
                    eventId: event.id,
                    label: moveRanking.signalsById[event.id].label,
                  });
                  void logProductEvent({
                    eventName: "the_move_click",
                    eventId: event.id,
                    source: "home",
                    metadata: {
                      placement: "home_feed_card",
                      label: moveRanking.signalsById[event.id].label,
                    },
                  });
                }
              }}
              className="group block rounded-2xl bg-zinc-900/55 border border-white/10 hover:border-white/20 transition overflow-hidden hover:-translate-y-0.5 duration-200"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-zinc-900 relative">
                    {showThumb ? (
                      <img
                        src={event.image_url!}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() =>
                          setBadThumbs((prev) => {
                            const n = new Set(prev);
                            n.add(event.id);
                            return n;
                          })
                        }
                      />
                    ) : (
                      <div className="w-full h-full relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/25 to-pink-500/25" />
                        <div className="absolute inset-0 bg-black/35" />
                        <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-purple-500/20 blur-3xl" />
                        <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-pink-500/20 blur-3xl" />
                        <div className="relative w-full h-full flex items-center justify-center">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-black/20 border border-white/10">
                            <Ticket className="w-4 h-4 text-white/75" />
                            <span className="text-[11px] font-semibold text-white/75">No art</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {moveRanking.signalsById[event.id] ? (
                          <div className="mb-2">
                            <TheMoveBadge signal={moveRanking.signalsById[event.id]} compact />
                          </div>
                        ) : null}
                        <div className="text-[18px] font-semibold leading-tight truncate">{event.title}</div>
                      </div>

                      <button
                        type="button"
                        disabled={working || featureFlags.killSwitchRsvpWrites}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void toggleRsvp(event.id);
                        }}
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition active:scale-[0.99] disabled:opacity-60 ${
                          going
                            ? "bg-green-500/15 border-green-500/30 text-green-200"
                            : "bg-gradient-to-r from-pink-600 to-purple-600 border-white/10 text-white"
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        {going ? "You're going 🎉" : "RSVP"}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {socialUrls.length > 0 ? (
                        <AvatarStack
                          urls={socialUrls}
                          total={Math.max(totalGoing, socialUrls.length)}
                        />
                      ) : null}
                      {socialLabel ? (
                        <div className="text-sm font-medium text-zinc-100 truncate">{socialLabel}</div>
                      ) : null}
                      {moveRanking.signalsById[event.id] ? (
                        <div className="text-xs text-pink-200/85 truncate">
                          {moveRanking.signalsById[event.id].explainer}
                        </div>
                      ) : null}
                      {friendCue ? (
                        <div className="text-xs text-zinc-400 truncate">{friendCue}</div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                          <div className="inline-flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-zinc-500" />
                            <span>
                              {totalGoing > 0 ? `🔥 ${totalGoing} going` : "Be the one who starts it"}
                            </span>
                          </div>
                          {!going && totalGoing > 0 ? <span>RSVP to see everyone</span> : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                          <div className="inline-flex items-center gap-1.5 max-w-full">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                            <span className="truncate">
                              {formatDateRange(event.event_date, event.event_end_date)}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 max-w-full">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{event.location ?? "TBD"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleShareInvite(event.id, event.title);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 hover:bg-white/10"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share with one friend
                        </button>
                        <div className="text-[11px] text-zinc-600 group-hover:text-zinc-500 transition whitespace-nowrap">
                          View -&gt;
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {feedEvents.length === 0 ? (
          <div className="text-center text-zinc-500 mt-12">
            <div>Your feed is still waiting on your first move.</div>
            <div className="mt-1 text-sm text-zinc-600">
              Add one friend or RSVP to one event and this starts feeling alive fast.
            </div>
            <Link
              to="/explore"
              className="inline-flex mt-3 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-zinc-200 hover:bg-white/15"
            >
              Find tonight's first signal
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

