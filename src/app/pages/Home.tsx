import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { isEventUpcomingOrOngoing } from "@/lib/eventDates";
import { formatRetrySeconds, getRateLimitStatus } from "@/lib/rateLimit";
import { featureFlags } from "@/lib/featureFlags";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  event_source?: string | null;
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
const surfaceIngestedSources =
  (import.meta.env.VITE_SURFACE_INGESTED_SOURCES as string | undefined) === "true";
const hiddenSources = new Set(["ra", "ticketmaster_artist", "ticketmaster_nearby", "eventbrite"]);

function canSurfaceSource(source: string | null | undefined): boolean {
  const s = (source ?? "").trim().toLowerCase();
  if (!s) return true;
  if (!hiddenSources.has(s)) return true;
  return surfaceIngestedSources;
}

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

  const [othersAvatarPoolByEvent, setOthersAvatarPoolByEvent] = useState<Record<string, string[]>>({
  });

  const [badThumbs, setBadThumbs] = useState<Set<string>>(new Set());

  const [workingByEvent, setWorkingByEvent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const uid = session?.user?.id ?? null;
    setViewerId(uid);

    const { data: eventData, error: eErr } = await supabase
      .from("events")
      .select("id,title,location,event_date,event_end_date,image_url,event_source")
      .order("event_date", { ascending: true });

    if (eErr) {
      console.error(eErr);
      toast.error("Failed to load events");
      setEvents([]);
      setLoading(false);
      return;
    }

    const nowTs = Date.now();
    const rows = ((eventData ?? []) as EventRow[]).filter(
      (e) => canSurfaceSource(e.event_source) && isEventUpcomingOrOngoing(e, nowTs)
    );
    setEvents(rows);

    if (!uid) {
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
      setLoading(false);
      return;
    }

    const { data: fids, error: fErr } = await supabase.rpc("get_friend_ids");
    if (fErr) console.error(fErr);
    const fset = new Set<string>((fids ?? []) as string[]);
    setFriendIds(fset);

    const { data: attData, error: aErr } = await supabase
      .from("attendees")
      .select("event_id,user_id,created_at, profiles(display_name,username,avatar_url)");

    if (aErr) {
      console.error(aErr);
      setMyGoing(new Set());
      setFriendAvatarsByEvent({});
      setFriendNamesByEvent({});
      setRecentFriendCueByEvent({});
      setFriendCounts({});
      setOthersCounts({});
      setOthersAvatarsByEvent({});
      setViewerAvatarByEvent({});
      setOthersAvatarPoolByEvent({});
      setLoading(false);
      return;
    }

    const attendees = (attData ?? []) as AttendeeRow[];

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

    setLoading(false);
  };

  const feedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aFriends = friendCounts[a.id] ?? 0;
      const bFriends = friendCounts[b.id] ?? 0;
      if (aFriends !== bFriends) return bFriends - aFriends;
      const aTs = new Date(a.event_date ?? 0).getTime();
      const bTs = new Date(b.event_date ?? 0).getTime();
      return aTs - bTs;
    });
  }, [events, friendCounts]);
  const hasAtLeastOneFriend = friendIds.size > 0;

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
        {viewerId && !hasAtLeastOneFriend && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/55 p-4">
            <div className="text-sm font-semibold text-zinc-100">Whozin is better with friends</div>
            <div className="mt-1 text-xs text-zinc-400">
              Add a few friends to unlock stronger social momentum.
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
              onClick={() => track("event_view", { source: "home_feed", eventId: event.id })}
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
                      {friendCue ? (
                        <div className="text-xs text-zinc-400 truncate">{friendCue}</div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                          <div className="inline-flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-zinc-500" />
                            <span>{totalGoing > 0 ? `🔥 ${totalGoing} going` : "Be first to go"}</span>
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

                      <div className="text-[11px] text-zinc-600 group-hover:text-zinc-500 transition whitespace-nowrap">
                        View -&gt;
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
            <div>No upcoming events yet.</div>
            <Link
              to="/explore"
              className="inline-flex mt-3 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-sm text-zinc-200 hover:bg-white/15"
            >
              Explore new events
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

