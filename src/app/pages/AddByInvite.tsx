import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin, Share2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { featureFlags } from "@/lib/featureFlags";
import {
  claimPendingReferral,
  registerReferralOpen,
  storePendingReferral,
} from "@/lib/referrals";
import { formatEventDateTimeRange } from "@/lib/eventDates";
import { isEventVisible } from "@/lib/eventVisibility";

type InviteProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type InviteEvent = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  event_source?: string | null;
  moderation_status?: string | null;
};

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function displayName(profile: InviteProfile | null, fallbackHandle: string) {
  const username = profile?.username?.trim();
  if (username) return `@${username}`;
  const name = profile?.display_name?.trim();
  if (name) return name;
  return `@${fallbackHandle}`;
}

export default function AddByInvite() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [inviteProfile, setInviteProfile] = useState<InviteProfile | null>(null);
  const [event, setEvent] = useState<InviteEvent | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [sessionReady, setSessionReady] = useState(false);
  const registeredOpenRef = useRef(false);
  const autoForwardedRef = useRef(false);

  const raw = handle ?? "";
  const username = raw.startsWith("@") ? raw.slice(1) : raw;
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const refToken = (params.get("ref") ?? "").trim();
  const source = (params.get("src") ?? "share_link").trim() || "share_link";
  const eventId = params.get("event");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (featureFlags.killSwitchInvites || featureFlags.killSwitchFriendAdds) {
        toast.error("Invite links are down right now");
        navigate("/friends");
        return;
      }

      if (!username) {
        toast.error("That invite link is off");
        navigate("/");
        return;
      }

      setLoading(true);

      const [
        sessionRes,
        profileRes,
        eventRes,
        attendeeCountRes,
      ] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from("profiles")
          .select("username,display_name,avatar_url")
          .eq("username", username)
          .maybeSingle(),
        isUuid(eventId)
          ? supabase
              .from("events")
              .select("id,title,location,event_date,event_end_date,image_url,event_source,moderation_status")
              .eq("id", eventId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        isUuid(eventId)
          ? supabase
              .from("attendees")
              .select("event_id", { count: "exact", head: true })
              .eq("event_id", eventId)
          : Promise.resolve({ count: 0, error: null }),
      ]);
      const visibleEvent = isEventVisible(eventRes.data as InviteEvent | null)
        ? ((eventRes.data as InviteEvent | null) ?? null)
        : null;

      if (!cancelled) {
        setSessionReady(!!sessionRes.data.session);
        setInviteProfile((profileRes.data as InviteProfile | null) ?? null);
        setEvent(visibleEvent);
        setAttendeeCount(attendeeCountRes.count ?? 0);
        setLoading(false);
      }

      if (refToken && !registeredOpenRef.current) {
        registeredOpenRef.current = true;
        try {
          await registerReferralOpen({
            token: refToken,
            eventId: isUuid(eventId) ? eventId : null,
            source,
          });
          track("invite_landing_viewed", {
            source,
            eventId,
            hasEvent: !!visibleEvent,
          });
        } catch (err) {
          console.error("Failed to register referral open:", err);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, navigate, refToken, source, username]);

  const inviterLabel = useMemo(() => displayName(inviteProfile, username), [inviteProfile, username]);

  const completeInviteForSignedInUser = async () => {
    if (working) return;

    setWorking(true);

    try {
      if (refToken) {
        await claimPendingReferral(source);
      }

      const { error } = await supabase.rpc("add_friend_by_username", {
        friend_username: username,
      });

      if (error) {
        const lowered = (error.message ?? "").toLowerCase();
        if (lowered.includes("duplicate")) {
          // Already connected is fine; keep going.
        } else if (lowered.includes("cannot add yourself")) {
          // Self-invite is also fine; keep going.
        } else {
          throw error;
        }
      } else {
        track("friend_add_submitted", { source: "invite" });
        track("friend_add", { source: "invite", mode: "submitted" });
      }

      if (isUuid(eventId)) {
        navigate(`/event/${eventId}?src=share_link`, { replace: true });
        return;
      }

      navigate("/friends", { replace: true });
    } catch (error: any) {
      console.error("Invite add error:", error);
      toast.error(error?.message ?? "Could not open that invite");
      track("friend_add_failed", { source: "invite" });
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (loading || !sessionReady || !isUuid(eventId) || autoForwardedRef.current) return;
    autoForwardedRef.current = true;
    void completeInviteForSignedInUser();
  }, [eventId, loading, sessionReady]);

  const handlePrimaryAction = async () => {
    if (featureFlags.killSwitchInvites || featureFlags.killSwitchFriendAdds) {
      toast.error("Invite links are down right now");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      if (refToken) {
        storePendingReferral({
          token: refToken,
          eventId: isUuid(eventId) ? eventId : null,
          source,
          openedWhileLoggedOut: true,
        });
      }
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    await completeInviteForSignedInUser();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading invite...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
        <div className="rounded-[32px] border border-white/10 bg-zinc-950/80 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            {inviteProfile?.avatar_url ? (
              <img
                src={inviteProfile.avatar_url}
                alt={inviterLabel}
                className="h-14 w-14 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-zinc-300">
                {inviterLabel.replace(/^@/, "").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-300">
                From your circle
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                {inviterLabel} wants you there
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Connect on Whozin and see if this is actually the move.
              </div>
            </div>
          </div>

          {event ? (
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900/55">
              <div className="relative h-52">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-pink-600/35 via-purple-600/30 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white/85">
                  <Users className="h-3.5 w-3.5" />
                  {attendeeCount > 0 ? `${attendeeCount} going` : "Be early here"}
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-2xl font-bold leading-tight">{event.title}</div>
                  <div className="mt-1 text-sm text-zinc-200">
                    {formatEventDateTimeRange(event)}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Date
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatEventDateTimeRange(event)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Location
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {event.location ?? "Location TBD"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-fuchsia-400/15 bg-white/[0.03] p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300">
                    Why this matters
                  </div>
                  <div className="mt-1 text-sm text-zinc-200">
                    Join {inviterLabel}, see who's going, and decide faster with real social signal.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-zinc-900/50 p-5">
              <div className="text-lg font-semibold text-white">Connect with {inviterLabel}</div>
              <div className="mt-2 text-sm text-zinc-400">
                This gets you into their Whozin circle so you can spot the right nights sooner.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handlePrimaryAction()}
            disabled={working}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sessionReady ? <UserPlus className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {working
                ? "Joining..."
              : sessionReady
              ? event
                ? "Join and open event"
                : "Join Whozin"
              : event
              ? "Open event"
              : "Keep going"}
          </button>

          <div className="mt-3 text-center text-xs text-zinc-500">
            Private by default. You stay inside the circle unless you choose to show up.
          </div>

          {event ? (
            <div className="mt-4 text-center text-sm text-zinc-400">
              Already on Whozin?{" "}
              <Link
                to={`/event/${event.id}?src=share_link`}
                className="font-semibold text-zinc-100 hover:text-white"
              >
                Open event now
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
