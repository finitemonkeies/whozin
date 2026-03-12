import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isEventPast, isEventUpcomingOrOngoing } from "@/lib/eventDates";
import { createReferralInviteLink } from "@/lib/referrals";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";
import { isEventVisible } from "@/lib/eventVisibility";
import { shareInviteLink } from "@/lib/inviteSharing";
import { featureFlags } from "@/lib/featureFlags";
import { NotificationsPanel } from "@/app/components/NotificationsPanel";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

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

function titleize(username?: string | null) {
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

  const displayName = useMemo(() => titleize(profile?.username), [profile]);
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

    const {
      data: { session },
      error: sessErr,
    } = await supabase.auth.getSession();

    if (sessErr) console.error(sessErr);

    const userId = session?.user?.id;
    if (!userId) {
      toast.error("Not signed in");
      setLoading(false);
      return;
    }

    // Profile row
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .eq("id", userId)
      .single();

    if (pErr) {
      console.error(pErr);
      toast.error("Failed to load profile", { description: pErr.message });
      setLoading(false);
      return;
    }

    setProfile(p as ProfileRow);

    // Friends count
    const { data: friendIds, error: fErr } = await supabase.rpc("get_friend_ids");
    if (fErr) console.error(fErr);
    setFriendsCount(Array.isArray(friendIds) ? friendIds.length : 0);

    // Events count (total RSVPs)
    const { count } = await supabase
      .from("attendees")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", userId);

    setEventsCount(count ?? 0);

    // Upcoming events
    const { data: attendeeRows, error: aErr } = await supabase
      .from("attendees")
      .select("event_id")
      .eq("user_id", userId);

    if (aErr) {
      console.error(aErr);
      setUpcoming([]);
      setPastEvents([]);
      setLoading(false);
      return;
    }

    const eventIds = (attendeeRows ?? []).map((r: any) => r.event_id).filter(Boolean);

    if (eventIds.length === 0) {
      setUpcoming([]);
      setPastEvents([]);
      setLoading(false);
      return;
    }

    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .select("id,title,location,event_date,event_end_date,image_url,event_source,moderation_status")
      .in("id", eventIds)
      .order("event_date", { ascending: true });

    if (eventsErr) {
      console.error(eventsErr);
      setUpcoming([]);
      setPastEvents([]);
      setLoading(false);
      return;
    }

    const rows = ((events ?? []) as EventRow[]).filter((e) => isEventVisible(e));
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
    void load();
  }, []);

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
            title: "Join me on Whozin",
            text: "See who is going and figure out the move on Whozin.",
            url,
          });
          await logProductEvent({
            eventName: "invite_sent",
            source: "profile_share",
            metadata: { channel: "native_share" },
          });
          track("invite_share", { source: "profile_share", channel: "native_share" });
          toast.success("Invite shared");
          return;
        } catch {
          // Fall back to copy below.
        }
      }

      await copyInviteUrl(url);
      await logProductEvent({
        eventName: "invite_link_copied",
        source: "profile_share",
        metadata: { channel: "copy_fallback" },
      });
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
      await logProductEvent({
        eventName: "invite_link_copied",
        source: "profile_share",
        metadata: { channel: "copy" },
      });
      track("invite_copy", { source: "profile_share", channel: "copy" });
      await logProductEvent({
        eventName: "invite_sent",
        source: "profile_share",
        metadata: { channel: "copy" },
      });
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
      <div className="relative h-48" style={coverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />

        <Link
          to="/settings"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/55 transition"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-white/90" />
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 -mt-16">
        {/* Header: centered stack */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar + Premium glow */}
          <div className="relative w-36 h-36">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-2xl opacity-25" />

            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="relative w-36 h-36 rounded-full object-cover border-4 border-black shadow-xl"
                loading="lazy"
              />
            ) : (
              <div className="relative w-36 h-36 rounded-full bg-zinc-800 border-4 border-black shadow-xl" />
            )}
          </div>

          {/* Name + handle */}
          <div className="mt-5">
            <div className="text-3xl font-bold tracking-tight">{displayName}</div>
            <div className="text-zinc-500 text-base mt-1">{handle}</div>

            <div className="mt-3 text-xs text-zinc-500 max-w-sm">
              Friends and friends-of-friends see you first. Everyone else sees you after you lock in.
            </div>
          </div>

          {/* Stats (tight cluster + hints when zero) */}
          <div className="mt-7 flex items-center justify-center gap-10">
            <Stat value={eventsCount} label="Events" hint="Lock one plan" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value={friendsCount} label="Friends" hint="Bring one in" />
          </div>

          {/* Actions */}
          <div className="mt-6 w-full max-w-md grid grid-cols-2 gap-3">
            <Link
              to="/friends"
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-center font-semibold"
            >
              Bring your crew
            </Link>

            <Link
              to="/profile/edit"
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-center font-semibold"
            >
              Edit profile
            </Link>
          </div>

          <div className="mt-3 w-full max-w-md">
            <button
              onClick={() => void handleOpenProfileInvite()}
              className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-center font-semibold hover:brightness-110 transition"
            >
              Copy link for a friend
            </button>
          </div>

          {onboardingMode ? (
            <div className="mt-4 w-full max-w-md rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-left">
              <div className="text-sm font-semibold text-white">Final step: send one invite</div>
              <div className="mt-1 text-xs text-zinc-300">
                One clean share is enough to get the night moving. Send it to the friend most likely to say yes.
              </div>
            </div>
          ) : null}
        </div>

        {/* Divider */}
        <div className="mt-10 h-px bg-white/10" />

        <div className="mt-8">
          <NotificationsPanel
            compact
            title="The Loop"
            subtitle="Your inbox for friend movement, momentum, and one-friend nudges."
            limit={6}
          />
        </div>

        <div className="mt-10 h-px bg-white/10" />

        {/* Upcoming */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Upcoming</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5 text-zinc-400">
              Nothing locked in yet.
              <div className="text-sm text-zinc-500 mt-1">
                Lock one good event and it lands here.
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
                    <div className="flex gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-zinc-900 relative">
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
                        <div className="text-lg font-semibold truncate">{e.title}</div>
                        <div className="text-zinc-400 text-sm mt-1">
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
                            <Share2 className="h-3.5 w-3.5" />
                            Bring your crew
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
                    <div className="flex gap-4 p-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-zinc-900 relative">
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
                        <div className="text-lg font-semibold truncate">{e.title}</div>
                        <div className="text-zinc-400 text-sm mt-1">
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
            <DrawerTitle className="text-xl">Bring a friend</DrawerTitle>
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
              className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
