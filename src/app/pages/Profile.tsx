import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Settings } from "lucide-react";
import { ShareIcon } from "@/app/components/WhozinIcons";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isEventPast, isEventUpcomingOrOngoing } from "@/lib/eventDates";
import { createReferralInviteLink } from "@/lib/referrals";
import { track } from "@/lib/analytics";
import { isEventVisible } from "@/lib/eventVisibility";
import { shareInviteLink } from "@/lib/inviteSharing";
import { featureFlags } from "@/lib/featureFlags";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  getPartnerBadgeLabel,
  getPartnerTypeLabel,
  isPartnerProfile,
  type PartnerProfileFields,
} from "@/lib/partnerProfiles";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";

const NotificationsPanel = lazy(() =>
  import("@/app/components/NotificationsPanel").then((m) => ({ default: m.NotificationsPanel }))
);

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
} & PartnerProfileFields;

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

function formatDateTime(value?: string | null) {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleize(displayName?: string | null, username?: string | null) {
  if (displayName?.trim()) return displayName.trim();
  if (!username) return "Your Profile";
  return username
    .split(/[_\-.]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function initials(title?: string | null) {
  if (!title) return "EV";
  const parts = title.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "E";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "V";
  return (a + b).toUpperCase();
}

function Stat({
  value,
  label,
  hint,
}: {
  value: number | string;
  label: string;
  hint?: string;
}) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const showHint = Number.isFinite(numericValue) && numericValue === 0 && !!hint;

  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mt-1">
        {label}
      </div>
      {showHint ? (
        <div className="mt-1 text-[11px] text-zinc-600">{hint}</div>
      ) : null}
    </div>
  );
}

export function Profile() {
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
  const [profileInviteUrl, setProfileInviteUrl] = useState("");
  const [loadingProfileInviteUrl, setLoadingProfileInviteUrl] = useState(false);
  const [sharingProfileInvite, setSharingProfileInvite] = useState(false);
  const [copyingProfileInvite, setCopyingProfileInvite] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [pastEvents, setPastEvents] = useState<EventRow[]>([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);

  const displayName = useMemo(
    () => titleize(profile?.display_name, profile?.username),
    [profile?.display_name, profile?.username]
  );
  const handle = useMemo(() => (profile?.username ? `@${profile.username}` : "@unknown"), [
    profile?.username,
  ]);
  const onboardingMode = useMemo(
    () => new URLSearchParams(location.search).get("onboarding") === "1",
    [location.search]
  );

  const avatarUrl = useMemo(() => {
    if (!profile?.avatar_url) return "";
    // Bust cache lightly so new uploads show immediately
    const bust = localStorage.getItem("whozin_avatar_bust") || "0";
    const sep = profile.avatar_url.includes("?") ? "&" : "?";
    return `${profile.avatar_url}${sep}v=${encodeURIComponent(bust)}`;
  }, [profile?.avatar_url]);

  const load = async () => {
    setLoading(true);
    const userId = user?.id ?? null;
    if (!userId) {
      toast.error("Not signed in");
      setLoading(false);
      return;
    }

    const [profileRes, friendIdsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url,account_type,partner_type,partner_status,partner_badge_label,partner_slug,partner_contact_email,partner_instagram_url,partner_website_url,partner_bio_short"
        )
        .eq("id", userId)
        .single(),
      supabase.rpc("get_friend_ids"),
    ]);

    if (profileRes.error) {
      console.error(profileRes.error);
      toast.error("Failed to load profile", { description: profileRes.error.message });
      setLoading(false);
      return;
    }

    const loadedProfile = profileRes.data as ProfileRow;
    setProfile(loadedProfile);
    if (friendIdsRes.error) console.error(friendIdsRes.error);
    setFriendsCount(Array.isArray(friendIdsRes.data) ? friendIdsRes.data.length : 0);
    let events: EventRow[] = [];

    if (isPartnerProfile(loadedProfile)) {
      const [countRes, hostedEventsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id", { head: true, count: "exact" })
          .eq("organizer_profile_id", userId),
        supabase
          .from("events")
          .select("id,title,location,event_date,event_end_date,image_url,event_source,moderation_status")
          .eq("organizer_profile_id", userId)
          .order("event_date", { ascending: true }),
      ]);

      setEventsCount(countRes.count ?? 0);

      if (hostedEventsRes.error) {
        console.error(hostedEventsRes.error);
        setUpcoming([]);
        setPastEvents([]);
        setLoading(false);
        return;
      }

      events = (hostedEventsRes.data ?? []) as EventRow[];
    } else {
      const [countRes, attendeeRowsRes] = await Promise.all([
        supabase.from("attendees").select("user_id", { head: true, count: "exact" }).eq("user_id", userId),
        supabase.from("attendees").select("event_id").eq("user_id", userId),
      ]);

      setEventsCount(countRes.count ?? 0);

      if (attendeeRowsRes.error) {
        console.error(attendeeRowsRes.error);
        setUpcoming([]);
        setPastEvents([]);
        setLoading(false);
        return;
      }

      const eventIds = (attendeeRowsRes.data ?? []).map((r: any) => r.event_id).filter(Boolean);
      if (eventIds.length === 0) {
        setUpcoming([]);
        setPastEvents([]);
        setLoading(false);
        return;
      }

      const eventsRes = await supabase
        .from("events")
        .select("id,title,location,event_date,event_end_date,image_url,event_source,moderation_status")
        .in("id", eventIds)
        .order("event_date", { ascending: true });

      if (eventsRes.error) {
        console.error(eventsRes.error);
        setUpcoming([]);
        setPastEvents([]);
        setLoading(false);
        return;
      }

      events = (eventsRes.data ?? []) as EventRow[];
    }

    const rows = events.filter((e) => isEventVisible(e));
    const nowTs = Date.now();
    setUpcoming(rows.filter((e) => isEventUpcomingOrOngoing(e, nowTs)));
    setPastEvents(
      rows
        .filter((e) => isEventPast(e, nowTs))
        .sort((a, b) => {
          const aTs = new Date(a.event_end_date || a.event_date || 0).getTime();
          const bTs = new Date(b.event_end_date || b.event_date || 0).getTime();
          return bTs - aTs;
        })
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    void load();
  }, [user?.id]);

  const ensureProfileInviteUrl = async () => {
    if (profileInviteUrl) return profileInviteUrl;

    const username = profile?.username;
    if (!username) {
      throw new Error("Set a username first");
    }

    setLoadingProfileInviteUrl(true);
    try {
      const created = await createReferralInviteLink({
        source: "profile_share",
      });
      setProfileInviteUrl(created.url);
      return created.url;
    } finally {
      setLoadingProfileInviteUrl(false);
    }
  };

  const copyInviteUrl = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        return;
      } catch {
        // Fall back for Safari/webview cases.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) throw new Error("Could not copy that link in this browser.");
  };

  const handleOpenProfileInvite = async () => {
    const username = profile?.username;
    if (!username) {
      toast.error("Set a username first");
      return;
    }

    setInviteDrawerOpen(true);
    try {
      await ensureProfileInviteUrl();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not make that link");
    }
  };

  const handleShareProfileInvite = async () => {
    setSharingProfileInvite(true);
    try {
      const url = await ensureProfileInviteUrl();
      if (navigator.share) {
        try {
          await navigator.share({
            url,
          });
          await import("@/lib/productEvents").then(({ logProductEvent }) =>
            logProductEvent({
              eventName: "invite_sent",
              source: "profile_share",
              metadata: { channel: "native_share" },
            })
          );
          track("invite_share", { source: "profile_share", channel: "native_share" });
          toast.success("Invite shared");
          return;
        } catch {
          // Fall back to copy below.
        }
      }

      await copyInviteUrl(url);
      await import("@/lib/productEvents").then(({ logProductEvent }) =>
        logProductEvent({
          eventName: "invite_link_copied",
          source: "profile_share",
          metadata: { channel: "copy_fallback" },
        })
      );
      track("invite_copy", { source: "profile_share", channel: "copy_fallback" });
      toast.success("Link copied");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not share that link");
    } finally {
      setSharingProfileInvite(false);
    }
  };

  const handleCopyProfileInvite = async () => {
    setCopyingProfileInvite(true);
    try {
      const url = await ensureProfileInviteUrl();
      await copyInviteUrl(url);
      await import("@/lib/productEvents").then(({ logProductEvent }) =>
        logProductEvent({
          eventName: "invite_link_copied",
          source: "profile_share",
          metadata: { channel: "copy" },
        })
      );
      track("invite_copy", { source: "profile_share", channel: "copy" });
      await import("@/lib/productEvents").then(({ logProductEvent }) =>
        logProductEvent({
          eventName: "invite_sent",
          source: "profile_share",
          metadata: { channel: "copy" },
        })
      );
      track("invite_share", { source: "profile_share", channel: "copy" });
      toast.success("Link copied");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not make that link");
    } finally {
      setCopyingProfileInvite(false);
    }
  };

  const handleShareUpcoming = async (eventId: string, eventTitle: string) => {
    if (featureFlags.killSwitchInvites) {
      toast.error("Invites are temporarily unavailable");
      return;
    }

    track("invite_cta_clicked", {
      source: "profile_share",
      placement: "profile_upcoming",
      eventId,
    });

    try {
      const channel = await shareInviteLink({
        eventId,
        eventTitle,
        source: "profile_share",
      });
      if (channel === "share_canceled") return;
      toast.success(channel === "copy_fallback" ? "Invite link copied" : "Invite shared");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not share invite");
    }
  };

  const coverStyle = {
    background:
      "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
  } as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white px-5 pt-6">
        <div className="text-zinc-400">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Cover */}
      <div className="relative h-36 sm:h-44" style={coverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />

        <Link
          to="/settings"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 transition hover:bg-black/55"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-white/90" />
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 -mt-12">
        {/* Header: centered stack */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar + Premium glow */}
          <div className="relative h-24 w-24 sm:h-28 sm:w-28">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-2xl opacity-25" />

            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="relative h-24 w-24 rounded-full border-4 border-black object-cover shadow-xl sm:h-28 sm:w-28"
                loading="lazy"
              />
            ) : (
              <div className="relative h-24 w-24 rounded-full border-4 border-black bg-zinc-800 shadow-xl sm:h-28 sm:w-28" />
            )}
          </div>

          {/* Name + handle */}
          <div className="mt-4 w-full max-w-md">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="text-[2rem] font-bold tracking-tight sm:text-3xl">{displayName}</div>
              {isPartnerProfile(profile) ? (
                <div className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                  {getPartnerBadgeLabel(profile)}
                </div>
              ) : null}
            </div>
            <div className="mt-1 text-sm text-zinc-500 sm:text-base">{handle}</div>

            {isPartnerProfile(profile) ? (
              <>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {getPartnerTypeLabel(profile?.partner_type)}
                  {profile?.partner_status === "active" ? " - Active" : ""}
                </div>
                {profile?.partner_bio_short ? (
                  <div className="mt-2 text-sm text-zinc-300 max-w-md">{profile.partner_bio_short}</div>
                ) : null}
              </>
            ) : (
              <div className="mx-auto mt-3 max-w-sm text-xs text-zinc-500">
                Friends and friends-of-friends see you first. Everyone else sees you after you lock in.
              </div>
            )}
          </div>

          {/* Stats (tight cluster + hints when zero) */}
          <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3">
              <Stat
                value={eventsCount}
                label={isPartnerProfile(profile) ? "Hosted" : "Events"}
                hint={isPartnerProfile(profile) ? "Assign first event" : "Find one move"}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3">
              <Stat
                value={friendsCount}
                label={isPartnerProfile(profile) ? "Network" : "Friends"}
                hint={isPartnerProfile(profile) ? "Add team or allies" : "Bring one in"}
              />
            </div>
          </div>

          {isPartnerProfile(profile) ? (
            <div className="mt-5 flex w-full max-w-md flex-wrap justify-center gap-2">
              {profile?.partner_slug ? (
                <Link
                  to={`/partner/${profile.partner_slug}`}
                  className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/15"
                >
                  View organizer page
                </Link>
              ) : null}
              {profile?.partner_instagram_url ? (
                <a
                  href={profile.partner_instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
                >
                  Instagram
                </a>
              ) : null}
              {profile?.partner_website_url ? (
                <a
                  href={profile.partner_website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
                >
                  Website
                </a>
              ) : null}
              {profile?.partner_contact_email ? (
                <a
                  href={`mailto:${profile.partner_contact_email}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
                >
                  Contact
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-3">
            <Link
              to="/friends"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center font-semibold transition hover:bg-white/15"
            >
              Add friends
            </Link>

            <Link
              to="/profile/edit"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center font-semibold transition hover:bg-white/15"
            >
              Edit profile
            </Link>
          </div>

          <div className="mt-3 w-full max-w-md">
            <button
              onClick={() => void handleOpenProfileInvite()}
              className="whozin-brand-button w-full rounded-2xl px-4 py-3 text-center font-semibold text-white transition"
            >
              Copy link for a friend
            </button>
          </div>

          {onboardingMode ? (
            <div className="mt-4 w-full max-w-md rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-left">
              <div className="text-sm font-semibold text-white">
                {isPartnerProfile(profile) ? "Final step: share your first event" : "Final step: send one invite"}
              </div>
              <div className="mt-1 text-xs text-zinc-300">
                {isPartnerProfile(profile)
                  ? "Get one anchor event live, then send the tracked link to your crowd."
                  : "One share is enough to get the move going. Send it to the friend most likely to say yes."}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-zinc-950/55 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <Suspense fallback={null}>
            <NotificationsPanel
              compact
              title="The Loop"
              subtitle="Your inbox for friend movement, momentum, and one-friend nudges."
              limit={6}
            />
          </Suspense>
        </div>

        {/* Upcoming */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Upcoming</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5 text-zinc-400">
              Nothing locked in yet.
              <div className="text-sm text-zinc-500 mt-1">
                Find one good move and it lands here.
              </div>

              <div className="mt-4">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-white"
                >
                  Find the move
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((e) => {
                const hasThumb = !!e.image_url && e.image_url.trim().length > 0;

                return (
                  <Link
                    key={e.id}
                    to={`/event/${e.id}?src=profile`}
                    onClick={() => track("event_view", { source: "profile_upcoming", eventId: e.id })}
                    className="block rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition overflow-hidden hover:-translate-y-0.5 duration-200"
                  >
                    <div className="flex gap-3 p-4">
                      {/* Thumbnail */}
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                        {hasThumb ? (
                          <img
                            src={e.image_url!}
                            alt={e.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/25 to-pink-500/25" />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="relative w-full h-full flex items-center justify-center">
                              <span className="text-xs font-semibold tracking-wide text-white/90">
                                {initials(e.title)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold">{e.title}</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {formatDateTime(e.event_date)}
                          {e.location ? ` - ${e.location}` : ""}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-200">
                            Confirmed
                          </div>
                          <button
                            type="button"
                            onClick={(eventClick) => {
                              eventClick.preventDefault();
                              eventClick.stopPropagation();
                              void handleShareUpcoming(e.id, e.title);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                          >
                            <ShareIcon color="currentColor" className="h-3.5 w-3.5" />
                            Share invite
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {pastEvents.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-zinc-500 text-xl">Tickets</div>
              <h2 className="text-xl font-semibold">Past Events</h2>
            </div>

            <div className="space-y-4">
              {pastEvents.map((e) => {
                const hasThumb = !!e.image_url && e.image_url.trim().length > 0;

                return (
                  <Link
                    key={e.id}
                    to={`/event/${e.id}?src=profile`}
                    className="block rounded-2xl bg-zinc-900/45 border border-white/10 hover:border-white/20 transition overflow-hidden"
                  >
                    <div className="flex gap-3 p-4">
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                        {hasThumb ? (
                          <img
                            src={e.image_url!}
                            alt={e.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/20 to-zinc-500/20" />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="relative w-full h-full flex items-center justify-center">
                              <span className="text-xs font-semibold tracking-wide text-white/80">
                                {initials(e.title)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold">{e.title}</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {formatDateTime(e.event_date)}
                          {e.location ? ` - ${e.location}` : ""}
                        </div>

                        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/15 border border-zinc-500/25 text-zinc-300">
                          Attended
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <Drawer open={inviteDrawerOpen} onOpenChange={setInviteDrawerOpen}>
        <DrawerContent className="border-white/10 bg-zinc-950 text-white">
          <DrawerHeader className="px-5 pb-2">
            <DrawerTitle className="text-xl">Invite a friend</DrawerTitle>
            <DrawerDescription className="text-zinc-400">
              Share your invite link, or copy the URL below if Safari gets weird.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Invite link
              </div>
              <input
                readOnly
                value={loadingProfileInviteUrl ? "Generating your link..." : profileInviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-zinc-100 outline-none"
              />
              <div className="mt-2 text-xs text-zinc-500">
                If copy fails, press and hold the link to select it manually.
              </div>
            </div>
          </div>

          <DrawerFooter className="px-5 pt-3 pb-6">
            <button
              type="button"
              onClick={() => void handleShareProfileInvite()}
              disabled={loadingProfileInviteUrl || sharingProfileInvite}
              className="whozin-brand-button w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sharingProfileInvite ? "Sharing..." : "Share link"}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyProfileInvite()}
              disabled={loadingProfileInviteUrl || copyingProfileInvite}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 disabled:opacity-60"
            >
              {copyingProfileInvite ? "Copying..." : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setInviteDrawerOpen(false)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-zinc-300"
            >
              Close
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
