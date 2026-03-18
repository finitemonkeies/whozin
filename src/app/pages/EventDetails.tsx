import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  MapPin,
  Ticket,
  ShieldCheck,
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
import { featureFlags } from "@/lib/featureFlags";
import { rankMoveCandidates } from "@/lib/theMove";
import { TheMoveBadge } from "@/app/components/TheMoveBadge";
import { isEventVisible, sourceLabel } from "@/lib/eventVisibility";
import { reportEvent } from "@/lib/privacySafety";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description?: string | null;
  event_source?: string | null;
  venue_name?: string | null;
  city?: string | null;
  ticket_url?: string | null;
  external_url?: string | null;
  moderation_status?: string | null;
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
  if (mins < 10) return "just locked in";
  if (mins < 60) return `locked in ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `locked in ${hrs}h ago`;
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
          <img
            src={u}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
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

function importedEventAccent(source?: string | null) {
  const normalized = (source ?? "").trim().toLowerCase();
  if (normalized === "19hz") {
    return "linear-gradient(135deg, rgba(236,72,153,0.88), rgba(124,58,237,0.84) 52%, rgba(9,9,11,0.98))";
  }
  if (normalized === "ra") {
    return "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(124,58,237,0.82) 52%, rgba(9,9,11,0.98))";
  }
  return "linear-gradient(135deg, rgba(34,197,94,0.85), rgba(59,130,246,0.8) 52%, rgba(9,9,11,0.98))";
}

async function downloadShareCardPng(args: {
  title: string;
  dateLabel: string;
  locationLabel: string;
  inviteUrl: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not render share card");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0a0a0a");
  gradient.addColorStop(1, "#1f1328");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padX = 84;
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
      if (lines.length >= 3) break;
    }
    if (line && lines.length < 3) lines.push(line);
    return lines;
  };

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(padX, 240, canvas.width - padX * 2, 620);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 84px system-ui, -apple-system, Segoe UI, sans-serif";
  for (const [idx, line] of wrapText(args.title, canvas.width - padX * 2 - 80).entries()) {
    ctx.fillText(line, padX + 40, 360 + idx * 96);
  }

  ctx.font = "600 42px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(args.dateLabel, padX + 40, 620);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(args.locationLabel || "Location TBA", padX + 40, 690);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(padX, 1520, canvas.width - padX * 2, 170);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 44px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("I am going on Whozin", padX + 40, 1605);
  ctx.font = "500 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(args.inviteUrl.replace(/^https?:\/\//, ""), padX + 40, 1652);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not export share card"))), "image/png")
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `whozin-share-${Date.now()}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
  const [downloadingShareCard, setDownloadingShareCard] = useState(false);
  const [reportingEvent, setReportingEvent] = useState(false);
  const [heroImageOk, setHeroImageOk] = useState(true);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const lastTrackedViewKeyRef = useRef<string>("");

  const eventImage = useMemo(() => event?.image_url ?? "", [event?.image_url]);
  const isImportedEvent = useMemo(
    () => !!event?.event_source && event.event_source !== "internal",
    [event?.event_source]
  );
  const sourceName = useMemo(() => sourceLabel(event?.event_source), [event?.event_source]);
  const sourceAccent = useMemo(() => importedEventAccent(event?.event_source), [event?.event_source]);
  const officialUrl = useMemo(
    () => event?.ticket_url ?? event?.external_url ?? "",
    [event?.external_url, event?.ticket_url]
  );
  const rsvpSource = useMemo(
    () => getRsvpSourceFromSearch(location.search),
    [location.search]
  );
  const onboardingMode = useMemo(
    () => new URLSearchParams(location.search).get("onboarding") === "1",
    [location.search]
  );

  const invitePromptKey = useMemo(
    () => (viewerId && id ? `whozin_invite_prompt:${viewerId}:${id}` : ""),
    [viewerId, id]
  );

  useEffect(() => {
    setHeroImageOk(true);
    setHeroImageLoaded(false);
  }, [event?.id, event?.image_url]);

  useEffect(() => {
    if (!id || !isUuid(id) || !event) return;
    const key = `${id}:${rsvpSource}`;
    if (lastTrackedViewKeyRef.current === key) return;
    lastTrackedViewKeyRef.current = key;
    track("event_view", { eventId: id, source: rsvpSource });

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
  const moveSignal = useMemo(() => {
    if (!event) return null;
    return (
      rankMoveCandidates(
        [
          {
            id: event.id,
            title: event.title,
            startAt: event.event_date,
            totalRsvps: totalGoing,
            friendRsvps: friendsGoing.length,
            recentRsvps: attendees.filter((a) => {
              const createdAt = new Date(a.created_at ?? 0).getTime();
              return !Number.isNaN(createdAt) && Date.now() - createdAt <= 6 * 60 * 60 * 1000;
            }).length,
            quality: event.image_url ? 1 : 0.92,
          },
        ],
        "event"
      ).topSignal ?? null
    );
  }, [attendees, event, friendsGoing.length, totalGoing]);

  useEffect(() => {
    if (!moveSignal || !id || !isUuid(id)) return;
    track("the_move_impression", {
      source: rsvpSource,
      placement: "event_header",
      eventId: id,
      label: moveSignal.label,
      score: moveSignal.score,
    });
    void logProductEvent({
      eventName: "the_move_impression",
      eventId: id,
      source: rsvpSource,
      metadata: {
        placement: "event_header",
        label: moveSignal.label,
        score: moveSignal.score,
      },
    });
  }, [id, moveSignal, rsvpSource]);

  const loadFriendMap = async () => {
    setLoadingFriendMap(true);

    const { data, error } = await supabase.rpc("get_friend_ids");
    if (error) {
      console.error("get_friend_ids rpc error:", error);
      setFriendIds(new Set());
      setLoadingFriendMap(false);
      return;
    }

    const ids = Array.isArray(data)
      ? data.map((value) => String(value)).filter(Boolean)
      : [];
    setFriendIds(new Set(ids));
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
      toast.error(attErr.message ?? "Could not load the crowd");
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
        .select("id,title,location,event_date,event_end_date,image_url,description,event_source,venue_name,city,ticket_url,external_url,moderation_status")
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

      if (!isEventVisible(eventData as EventRow | null)) {
        toast.error("That event is not live right now");
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
        await loadFriendMap();
      } else {
        setIsGoing(false);
        setLoadingFriendMap(false);
      }
    };

    void load();
  }, [id]);

  const handleToggleGoing = async () => {
    if (featureFlags.killSwitchRsvpWrites) {
      toast.error("RSVP is temporarily unavailable");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Sign in to lock in");
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
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

        toast.success("You're in.");
        track("rsvp_updated", { source: rsvpSource, action: "add", eventId: id });
        track("rsvp_success", { source: rsvpSource, action: "add", eventId: id });

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

        toast.message("You're out.");
        track("rsvp_updated", { source: rsvpSource, action: "remove", eventId: id });
        track("rsvp_success", { source: rsvpSource, action: "remove", eventId: id });
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
    return <div className="bg-black min-h-screen text-white p-10">Loading the night...</div>;
  }

  if (!event) {
    return <div className="bg-black min-h-screen text-white p-10">That event is gone</div>;
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
    if (featureFlags.killSwitchInvites) {
      toast.error("Invites are temporarily unavailable");
      return;
    }
    const url = await createInviteLink();
    if (!url) return;
    await navigator.clipboard.writeText(url);

    await logProductEvent({
      eventName: "invite_link_copied",
      eventId: id,
      source: "rsvp_share",
      metadata: { channel: "copy" },
    });
    track("invite_copy", { source: "rsvp_share", eventId: id, channel: "copy" });
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
    if (featureFlags.killSwitchInvites) {
      toast.error("Invites are temporarily unavailable");
      return;
    }
    const url = await createInviteLink();
    if (!url) return;
    let channel: "native_share" | "copy_fallback" | "share_canceled" = "share_canceled";

    if (navigator.share) {
      try {
        await navigator.share({
          url,
        });
        channel = "native_share";
      } catch {
        // Ignore canceled share sheets.
        channel = "share_canceled";
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
      channel = "copy_fallback";
      track("invite_copy", { source: "rsvp_share", eventId: id, channel: "copy_fallback" });
    }

    if (channel === "share_canceled") {
      return;
    }

    await logProductEvent({
      eventName: "invite_sent",
      eventId: id,
      source: "rsvp_share",
      metadata: { channel },
    });
    track("invite_share", { source: "rsvp_share", eventId: id, channel });
    if (invitePromptKey) localStorage.setItem(invitePromptKey, String(Date.now()));
    setShowInvitePrompt(false);
  };

  const handleDownloadShareCard = async () => {
    if (featureFlags.killSwitchInvites) {
      toast.error("Invites are temporarily unavailable");
      return;
    }
    if (!id || !isUuid(id)) return;

    const url = await createInviteLink();
    if (!url) return;

    setDownloadingShareCard(true);
    try {
      await downloadShareCardPng({
        title: event.title,
        dateLabel: formatEventDateTimeRange(event),
        locationLabel: event.location ?? "Location TBA",
        inviteUrl: url,
      });

      await logProductEvent({
        eventName: "invite_sent",
        eventId: id,
        source: "rsvp_share",
        metadata: { channel: "download_card" },
      });
      track("invite_share", { source: "rsvp_share", eventId: id, channel: "download_card" });
      toast.success("Share card downloaded");
      if (invitePromptKey) localStorage.setItem(invitePromptKey, String(Date.now()));
      setShowInvitePrompt(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not download share card");
    } finally {
      setDownloadingShareCard(false);
    }
  };

  const handleSkipInvite = () => {
    if (invitePromptKey) localStorage.setItem(invitePromptKey, String(Date.now()));
    setShowInvitePrompt(false);
  };

  const handleReportEvent = async () => {
    if (!id || !isUuid(id) || reportingEvent) return;

    const confirmed = window.confirm(`Report ${event?.title ?? "this event"}? This sends it to admin review.`);
    if (!confirmed) return;

    const details = window.prompt(
      "What should we know about this event?",
      "Wrong info, unsafe listing, spam, duplicate, or something else"
    );
    if (details === null) return;

    setReportingEvent(true);
    try {
      await reportEvent({
        targetEventId: id,
        reason: "event_report",
        details,
      });
      toast.success("Event report submitted");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not report event");
    } finally {
      setReportingEvent(false);
    }
  };

  return (
    <div className="bg-black min-h-screen pb-40 text-white">
      <div className="relative h-72">
        {eventImage && heroImageOk ? (
          <>
            {!heroImageLoaded ? (
              <div className="absolute inset-0 animate-pulse bg-zinc-900/80" />
            ) : null}
            <img
              src={eventImage}
              alt={event.title}
              className={`w-full h-full object-cover transition duration-300 ${
                heroImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setHeroImageLoaded(true)}
              onError={() => setHeroImageOk(false)}
            />
          </>
        ) : (
          <div className="relative h-full w-full overflow-hidden" style={{ background: sourceAccent }}>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
            <div className="absolute -left-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-black/35 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isImportedEvent ? `${sourceName} import` : "Whozin event"}
              </div>
              <div className="max-w-[80%]">
                <div className="text-3xl font-bold leading-tight text-white line-clamp-3">{event.title}</div>
                <div className="mt-2 text-sm text-white/75">
                  {event.venue_name ?? event.location ?? event.city ?? "Bay Area"}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <Link
            to="/"
            className="p-2 bg-black/30 backdrop-blur-md rounded-full border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            {moveSignal ? <TheMoveBadge signal={moveSignal} compact /> : null}
            <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-semibold">
              {totalGoing} going
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-10 relative">
        {moveSignal ? (
          <div className="mb-3">
            <TheMoveBadge signal={moveSignal} showSecondary />
          </div>
        ) : null}
        <h1 className="text-3xl font-bold mb-2 leading-none drop-shadow-xl">{event.title}</h1>

        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          {moveSignal ? (
            <div className="mb-4 rounded-2xl border border-fuchsia-400/15 bg-white/[0.03] p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300">
                {moveSignal.secondary}
              </div>
              <div className="mt-1 text-sm text-zinc-200">{moveSignal.explainer}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {friendsGoing.length > 0
                  ? "Trending with your circle."
                  : "This is where the night has the cleanest momentum signal."}
              </div>
            </div>
          ) : null}
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
            <div className="mt-3 text-sm font-semibold text-zinc-100">People are in</div>
          ) : (
            <div className="mt-3 text-sm font-semibold text-zinc-200">Be first in</div>
          )}
          {friendRecentCue ? <div className="mt-1 text-xs text-zinc-400">{friendRecentCue}</div> : null}
          <div className="mt-2 text-xs text-zinc-300">
            {totalGoing > 0 ? `${totalGoing} going` : "No one is in yet"}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {isGoing ? "You unlocked the crowd." : "RSVP to unlock the crowd"}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {isGoing ? "Bring your people" : "Fastest way to call it"}
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {isGoing
                  ? "Send this to one friend and see if it turns into the move."
                  : "RSVP once and Whozin starts working harder for you."}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                {isGoing
                  ? "One clean share right now is usually enough to get the night moving."
                  : "You will unlock the full attendee view and make your next share much more credible."}
              </div>
            </div>
            {onboardingMode ? (
              <div className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold text-fuchsia-100">
                First-session focus
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isGoing ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleShareInvite()}
                  disabled={creatingInviteLink || featureFlags.killSwitchInvites}
                  className="rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Bring your crew
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyInvite()}
                  disabled={creatingInviteLink || featureFlags.killSwitchInvites}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10 disabled:opacity-60"
                >
                  Copy link
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleToggleGoing()}
                disabled={working || featureFlags.killSwitchRsvpWrites}
                className="rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                I'm going
              </button>
            )}

            {officialUrl ? (
              <a
                href={officialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10"
              >
                Official listing
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        {isImportedEvent ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/45 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Source
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  Imported from {sourceName}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  {event.ticket_url
                    ? "Direct ticket link attached."
                    : "Listing imported from a live nightlife source and held for review inside Whozin."}
                </div>
              </div>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                Checked
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Venue</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {event.venue_name ?? "Venue pending"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">City</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {event.city ?? event.location ?? "Bay Area"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Ticket status</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {event.ticket_url ? "Live link ready" : "Link pending"}
                </div>
              </div>
            </div>

            {officialUrl ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Official listing
                  <ExternalLink className="h-4 w-4" />
                </a>
                {event.ticket_url && event.external_url && event.ticket_url !== event.external_url ? (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/5"
                  >
                    Source page
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleReportEvent()}
                  disabled={reportingEvent}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-60"
                >
                  {reportingEvent ? "Reporting..." : "Report event"}
                  <ShieldCheck className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-4 my-6">
          <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div className="bg-purple-500/20 p-2.5 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">When</div>
              <div className="text-sm font-semibold">{formatEventDateTimeRange(event)}</div>
            </div>
          </div>

          <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div className="bg-pink-500/20 p-2.5 rounded-xl">
              <MapPin className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Where</div>
              <div className="text-sm font-semibold">{event.location ?? "TBD"}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Your people{" "}
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                {loadingAttendees || loadingFriendMap ? "..." : friendsGoing.length}
              </span>
            </h2>
          </div>

          {loadingAttendees || loadingFriendMap ? (
            <div className="text-zinc-400 text-sm">Loading the crowd...</div>
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
              <p className="text-sm text-zinc-500">
                No friends here yet. Send it to one friend and see if they bite.
              </p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Crowd{" "}
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                {loadingAttendees || loadingFriendMap ? "..." : othersGoing.length}
              </span>
            </h2>
          </div>

          {!isGoing ? (
            <div className="text-center py-6 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
              <p className="text-sm text-zinc-500">RSVP to unlock the rest of the crowd.</p>
            </div>
          ) : loadingAttendees || loadingFriendMap ? (
            <div className="text-zinc-400 text-sm">Loading the crowd...</div>
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
              <p className="text-sm text-zinc-500">
                Crowd is still forming. You could start it.
              </p>
            </div>
          )}
        </div>

        {showInvitePrompt ? (
          <div className="mb-8 bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
            <div className="text-sm font-semibold">Send this to one friend and see if it becomes the move.</div>
            <div className="text-xs text-zinc-400 mt-1">
              I'm thinking {event.title} might be the move. Send it to the friend most likely to say yes.
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void handleCopyInvite()}
                disabled={creatingInviteLink || featureFlags.killSwitchInvites}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                {creatingInviteLink ? "Getting link..." : "Copy link"}
              </button>
              <button
                type="button"
                onClick={() => void handleShareInvite()}
                disabled={creatingInviteLink || featureFlags.killSwitchInvites}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-60"
              >
                Send now
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadShareCard()}
                disabled={creatingInviteLink || downloadingShareCard || featureFlags.killSwitchInvites}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                {downloadingShareCard ? "Making card..." : "Save card"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSkipInvite}
              className="mt-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Not now
            </button>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-24 left-0 right-0 z-40 px-5">
        <button
          onClick={handleToggleGoing}
          disabled={working || featureFlags.killSwitchRsvpWrites}
          className={`w-full py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-60 ${
            isGoing
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-gradient-to-r from-pink-600 to-purple-600"
          }`}
        >
          <Ticket className="w-5 h-5" />
          {isGoing ? "You're in (tap to undo)" : "I'm going"}
          {working && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
        </button>
      </div>
    </div>
  );
}


