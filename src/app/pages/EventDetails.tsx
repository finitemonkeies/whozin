import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { formatEventDateTimeRange } from "@/lib/eventDates";
import { formatRetrySeconds, getRateLimitStatus } from "@/lib/rateLimit";
import { getRsvpSourceFromSearch } from "@/lib/rsvpSource";
import { logProductEvent } from "@/lib/productEvents";
import { createReferralInviteLink } from "@/lib/referrals";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description?: string | null;
  event_source?: string | null;
};

type AttendeeRow = {
  user_id: string;
  created_at?: string | null;
  profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

function isUuid(value: string) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

const RSVP_BUMP_KEY = "whozin_rsvp_bump";
const INVITE_PROMPT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const surfaceIngestedSources =
  (import.meta.env.VITE_SURFACE_INGESTED_SOURCES as string | undefined) === "true";
const hiddenSources = new Set(["ra", "ticketmaster_artist", "ticketmaster_nearby", "eventbrite"]);

function bumpRsvp() {
  localStorage.setItem(RSVP_BUMP_KEY, String(Date.now()));
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

function AvatarStack({ urls, total }: { urls: string[]; total: number }) {
  const show = urls.slice(0, 5);
  const extra = Math.max(0, total - show.length);
  if (total <= 0) return null;

  return (
    <div className="flex items-center -space-x-2">
      {show.map((u, idx) => (
        <div
          key={`${u}-${idx}`}
          className="h-9 w-9 overflow-hidden rounded-full border border-black bg-zinc-800"
        >
          <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
      {extra > 0 ? (
        <div className="h-9 w-9 rounded-full border border-black bg-white/10 text-xs font-semibold text-white/90 flex items-center justify-center">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

function canSurfaceSource(source: string | null | undefined): boolean {
  const s = (source ?? "").trim().toLowerCase();
  if (!s) return true;
  if (!hiddenSources.has(s)) return true;
  return surfaceIngestedSources;
}

export function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loadingFriendMap, setLoadingFriendMap] = useState(true);

  const [isGoing, setIsGoing] = useState(false);
  const [working, setWorking] = useState(false);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const lastTrackedViewKeyRef = useRef<string>("");

  const eventImage = useMemo(() => event?.image_url ?? "", [event?.image_url]);
  const rsvpSource = useMemo(
    () => getRsvpSourceFromSearch(location.search),
    [location.search]
  );

  const invitePromptKey = useMemo(
    () => (viewerId && id ? `whozin_invite_prompt:${viewerId}:${id}` : ""),
    [viewerId, id]
  );

  useEffect(() => {
    if (!id || !isUuid(id) || !event) return;
    const key = `${id}:${rsvpSource}`;
    if (lastTrackedViewKeyRef.current === key) return;
    lastTrackedViewKeyRef.current = key;

    void logProductEvent({
      eventName: "event_detail_view",
      eventId: id,
      source: rsvpSource,
    });
  }, [event, id, rsvpSource]);

  const friendsGoing = useMemo(() => {
    return attendees.filter((a) => friendIds.has(a.user_id));
  }, [attendees, friendIds]);

  const othersGoing = useMemo(() => {
    return attendees.filter((a) => !friendIds.has(a.user_id) && a.user_id !== viewerId);
  }, [attendees, friendIds, viewerId]);
  const totalGoing = attendees.length;
  const friendNames = useMemo(
    () => friendsGoing.map((a) => displayName(a.profiles)).filter(Boolean),
    [friendsGoing]
  );
  const friendClusterLabel = useMemo(() => {
    if (friendNames.length === 0) return "";
    if (friendNames.length === 1) return `${friendNames[0]} is going`;
    if (friendNames.length === 2) return `${friendNames[0]}, ${friendNames[1]} are going`;
    return `${friendNames[0]}, ${friendNames[1]} + ${friendNames.length - 2}`;
  }, [friendNames]);
  const friendRecentCue = useMemo(() => {
    const latest = [...friendsGoing]
      .filter((a) => !!a.created_at)
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )[0];
    if (!latest) return "";
    const rel = relativeRsvp(latest.created_at);
    if (!rel) return "";
    return `${displayName(latest.profiles)} ${rel}`;
  }, [friendsGoing]);
  const friendAvatarUrls = useMemo(
    () =>
      friendsGoing
        .map((a) => a.profiles?.avatar_url ?? "")
        .filter(Boolean)
        .slice(0, 5),
    [friendsGoing]
  );
  const allVisibleAvatars = useMemo(
    () =>
      [...friendsGoing, ...(isGoing ? othersGoing : [])]
        .map((a) => a.profiles?.avatar_url ?? "")
        .filter(Boolean)
        .slice(0, 5),
    [friendsGoing, isGoing, othersGoing]
  );

  const loadFriendMap = async (userId: string, attendeeUserIds: string[]) => {
    setLoadingFriendMap(true);

    const map = new Set<string>();

    for (const otherId of attendeeUserIds) {
      if (otherId === userId) continue;

      const { data, error } = await supabase.rpc("are_friends", {
        p_user_id: userId,
        p_other_id: otherId,
      });

      if (error) {
        console.error("are_friends rpc error:", error);
        continue;
      }

      if (data === true) map.add(otherId);
    }

    setFriendIds(map);
    setLoadingFriendMap(false);
  };

  const loadAttendees = async (eventId: string) => {
    setLoadingAttendees(true);

    const { data: attData, error: attErr } = await supabase
      .from("attendees")
      .select("user_id,created_at, profiles(display_name, username, avatar_url)")
      .eq("event_id", eventId);

    if (attErr) {
      console.error("Failed loading attendees:", attErr);
      toast.error(attErr.message ?? "Failed to load attendees");
      setAttendees([]);
      setLoadingAttendees(false);
      return [];
    }

    const rows = (attData ?? []) as AttendeeRow[];
    setAttendees(rows);
    setLoadingAttendees(false);
    return rows;
  };

  useEffect(() => {
    const load = async () => {
      setViewerId(null);
      setFriendIds(new Set());
      setLoadingFriendMap(true);

      if (!id) {
        toast.error("Bad event link (missing id)");
        setEvent(null);
        setLoadingEvent(false);
        setLoadingAttendees(false);
        setLoadingFriendMap(false);
        return;
      }

      if (!isUuid(id)) {
        toast.error("Bad event link (invalid id)");
        setEvent(null);
        setLoadingEvent(false);
        setLoadingAttendees(false);
        setLoadingFriendMap(false);
        return;
      }

      setLoadingEvent(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id ?? null;
      setViewerId(uid);

      const { data: eventData, error: eventErr } = await supabase
        .from("events")
        .select("id,title,location,event_date,event_end_date,image_url,description,event_source")
        .eq("id", id)
        .single();

      if (eventErr) {
        console.error("Failed loading event:", eventErr);
        toast.error(eventErr.message ?? "Failed to load event");
        setEvent(null);
        setLoadingEvent(false);
        setLoadingAttendees(false);
        setLoadingFriendMap(false);
        return;
      }

      if (!canSurfaceSource((eventData as EventRow | null)?.event_source)) {
        toast.error("Event unavailable");
        setEvent(null);
        setLoadingEvent(false);
        setLoadingAttendees(false);
        setLoadingFriendMap(false);
        return;
      }

      setEvent((eventData ?? null) as EventRow | null);
      setLoadingEvent(false);

      const rows = await loadAttendees(id);

      if (uid) {
        const mine = rows.some((r) => r.user_id === uid);
        setIsGoing(mine);

        const attendeeIds = rows.map((r) => r.user_id);
        await loadFriendMap(uid, attendeeIds);
      } else {
        setIsGoing(false);
        setLoadingFriendMap(false);
      }
    };

    void load();
  }, [id]);

  const handleToggleGoing = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Sign in to RSVP");
      navigate("/login");
      return;
    }

    if (!id || !isUuid(id)) return;

    const uid = session.user.id;

    if (working) return;

    const rl = getRateLimitStatus(`rsvp_details:${uid}:${id}`, 2000);
    if (!rl.allowed) {
      const seconds = formatRetrySeconds(rl.retryAfterMs);
      toast.error(`Please wait ${seconds}s before trying again.`);
      track("rsvp_rate_limited", { source: rsvpSource, eventId: id, seconds });
      return;
    }

    const nextGoing = !isGoing;
    setWorking(true);
    setIsGoing(nextGoing);

    if (rsvpSource === "explore") {
      void logProductEvent({
        eventName: "explore_rsvp_click",
        eventId: id,
        source: "explore",
        metadata: {
          action: nextGoing ? "add" : "remove",
        },
      });
    }

    setAttendees((prev) => {
      if (nextGoing) {
        if (prev.some((r) => r.user_id === uid)) return prev;
        const optimisticRow: AttendeeRow = {
          user_id: uid,
          profiles: null,
        };
        return [optimisticRow, ...prev];
      }
      return prev.filter((r) => r.user_id !== uid);
    });

    bumpRsvp();

    try {
      if (nextGoing) {
        const { error } = await supabase.from("attendees").insert({
          event_id: id,
          user_id: uid,
          rsvp_source: rsvpSource,
        });
        if (error) throw error;

        toast.success("You're going 🎉");
        track("rsvp_updated", { source: rsvpSource, action: "add", eventId: id });

        if (rsvpSource === "share_link") {
          void logProductEvent({
            eventName: "invite_rsvp_completed",
            eventId: id,
            source: "share_link",
          });
        }

        const lastPromptAtRaw = localStorage.getItem(`whozin_invite_prompt:${uid}:${id}`);
        const lastPromptAt = lastPromptAtRaw ? Number(lastPromptAtRaw) : 0;
        if (!lastPromptAt || Date.now() - lastPromptAt >= INVITE_PROMPT_COOLDOWN_MS) {
          setShowInvitePrompt(true);
        }
      } else {
        const { error } = await supabase
          .from("attendees")
          .delete()
          .eq("event_id", id)
          .eq("user_id", uid);
        if (error) throw error;

        toast.message("RSVP removed");
        track("rsvp_updated", { source: rsvpSource, action: "remove", eventId: id });
      }
    } catch (e: any) {
      console.error(e);

      setIsGoing((v) => !v);
      setAttendees((prev) => {
        if (nextGoing) {
          return prev.filter((r) => r.user_id !== uid);
        }
        const optimisticRow: AttendeeRow = { user_id: uid, profiles: null };
        return [optimisticRow, ...prev];
      });

      toast.error(e?.message ?? "Failed to update RSVP");
      track("rsvp_failed", {
        source: rsvpSource,
        action: nextGoing ? "add" : "remove",
        eventId: id,
        message: e?.message ?? "unknown_error",
      });
    } finally {
      setWorking(false);
    }
  };

  if (loadingEvent) {
    return <div className="bg-black min-h-screen text-white p-10">Loading event...</div>;
  }

  if (!event) {
    return <div className="bg-black min-h-screen text-white p-10">Event not found</div>;
  }

  const createInviteLink = async () => {
    if (!id || !isUuid(id)) return "";
    if (inviteLink) return inviteLink;

    setCreatingInviteLink(true);
    try {
      const created = await createReferralInviteLink({
        eventId: id,
        source: "rsvp_share",
      });
      setInviteLink(created.url);
      return created.url;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create invite link");
      return "";
    } finally {
      setCreatingInviteLink(false);
    }
  };

  const handleCopyInvite = async () => {
    const url = await createInviteLink();
    if (!url) return;
    await navigator.clipboard.writeText(url);

    await logProductEvent({
      eventName: "invite_link_copied",
      eventId: id,
      source: "rsvp_share",
      metadata: { channel: "copy" },
    });
    await logProductEvent({
      eventName: "invite_sent",
      eventId: id,
      source: "rsvp_share",
      metadata: { channel: "copy" },
    });

    toast.success("Invite link copied");
    if (invitePromptKey) localStorage.setItem(invitePromptKey, String(Date.now()));
    setShowInvitePrompt(false);
  };

  const handleShareInvite = async () => {
    const url = await createInviteLink();
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join me at ${event.title}`,
          text: `I'm going to ${event.title} on Whozin. Join me here:`,
          url,
        });
      } catch {
        // Ignore canceled share sheets.
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    }

    await logProductEvent({
      eventName: "invite_sent",
      eventId: id,
      source: "rsvp_share",
      metadata: { channel: navigator.share ? "native_share" : "copy_fallback" },
    });
    if (invitePromptKey) localStorage.setItem(invitePromptKey, String(Date.now()));
    setShowInvitePrompt(false);
  };

  const handleSkipInvite = () => {
    if (invitePromptKey) localStorage.setItem(invitePromptKey, String(Date.now()));
    setShowInvitePrompt(false);
  };

  return (
    <div className="bg-black min-h-screen pb-40 text-white">
      <div className="relative h-72">
        {eventImage ? (
          <img src={eventImage} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <Link
            to="/"
            className="p-2 bg-black/30 backdrop-blur-md rounded-full border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-semibold">
            {totalGoing} going
          </div>
        </div>
      </div>

      <div className="px-5 -mt-10 relative">
        <h1 className="text-3xl font-bold mb-2 leading-none drop-shadow-xl">{event.title}</h1>

        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          <AvatarStack
            urls={isGoing ? allVisibleAvatars : friendAvatarUrls}
            total={Math.max(
              totalGoing,
              isGoing ? allVisibleAvatars.length : friendAvatarUrls.length
            )}
          />
          {friendClusterLabel ? (
            <div className="mt-3 text-sm font-semibold text-zinc-100 truncate">{friendClusterLabel}</div>
          ) : totalGoing > 0 ? (
            <div className="mt-3 text-sm font-semibold text-zinc-100">People are going</div>
          ) : (
            <div className="mt-3 text-sm font-semibold text-zinc-200">Be first to go</div>
          )}
          {friendRecentCue ? <div className="mt-1 text-xs text-zinc-400">{friendRecentCue}</div> : null}
          <div className="mt-2 text-xs text-zinc-300">
            {totalGoing > 0 ? `🔥 ${totalGoing} going` : "No RSVPs yet"}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {isGoing ? "You unlocked attendee visibility." : "RSVP to see everyone"}
          </div>
        </div>

        <div className="flex gap-4 my-6">
          <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div className="bg-purple-500/20 p-2.5 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Date</div>
              <div className="text-sm font-semibold">{formatEventDateTimeRange(event)}</div>
            </div>
          </div>

          <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div className="bg-pink-500/20 p-2.5 rounded-xl">
              <MapPin className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Location</div>
              <div className="text-sm font-semibold">{event.location ?? "TBD"}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              See who's going{" "}
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                {loadingAttendees || loadingFriendMap ? "..." : friendsGoing.length}
              </span>
            </h2>
          </div>

          {loadingAttendees || loadingFriendMap ? (
            <div className="text-zinc-400 text-sm">Loading...</div>
          ) : friendsGoing.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {friendsGoing.map((a) => {
                const name = a.profiles?.display_name?.trim() || a.profiles?.username || "Anon";
                const avatar = a.profiles?.avatar_url ?? "";
                return (
                  <div key={a.user_id} className="flex flex-col items-center gap-2 min-w-[70px]">
                    <div className="relative">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-zinc-800"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-800" />
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 font-medium truncate w-full text-center">
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
              <p className="text-sm text-zinc-500">No friends visible for this event yet.</p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Others Going{" "}
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                {loadingAttendees || loadingFriendMap ? "..." : othersGoing.length}
              </span>
            </h2>
          </div>

          {!isGoing ? (
            <div className="text-center py-6 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
              <p className="text-sm text-zinc-500">RSVP to unlock attendees beyond your friends.</p>
            </div>
          ) : loadingAttendees || loadingFriendMap ? (
            <div className="text-zinc-400 text-sm">Loading...</div>
          ) : othersGoing.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {othersGoing.map((a) => {
                const name = a.profiles?.display_name?.trim() || a.profiles?.username || "Anon";
                const avatar = a.profiles?.avatar_url ?? "";
                return (
                  <div key={a.user_id} className="flex flex-col items-center gap-2 min-w-[70px]">
                    <div className="relative">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-zinc-800"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-800" />
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 font-medium truncate w-full text-center">
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
              <p className="text-sm text-zinc-500">No other visible attendees yet.</p>
            </div>
          )}
        </div>

        {showInvitePrompt ? (
          <div className="mb-8 bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
            <div className="text-sm font-semibold">Invite your friends</div>
            <div className="text-xs text-zinc-400 mt-1">
              I'm going to {event.title} on Whozin. Let your crew know.
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void handleCopyInvite()}
                disabled={creatingInviteLink}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                {creatingInviteLink ? "Preparing..." : "Copy link"}
              </button>
              <button
                type="button"
                onClick={() => void handleShareInvite()}
                disabled={creatingInviteLink}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-60"
              >
                Share
              </button>
              <button
                type="button"
                onClick={handleSkipInvite}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10"
              >
                Skip
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-24 left-0 right-0 z-40 px-5">
        <button
          onClick={handleToggleGoing}
          disabled={working}
          className={`w-full py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-60 ${
            isGoing
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-gradient-to-r from-pink-600 to-purple-600"
          }`}
        >
          <Ticket className="w-5 h-5" />
          {isGoing ? "You're going 🎉 (tap to undo)" : "I'm Going"}
          {working && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
        </button>
      </div>
    </div>
  );
}


