import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isEventPast, isEventUpcomingOrOngoing } from "@/lib/eventDates";

type ProfileRow = {
  id: string;
  display_name: string | null;
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

function resolveDisplayName(profile?: ProfileRow | null) {
  const byDisplayName = profile?.display_name?.trim();
  if (byDisplayName) return byDisplayName;
  return titleize(profile?.username);
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
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [pastEvents, setPastEvents] = useState<EventRow[]>([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);

  const displayName = useMemo(() => resolveDisplayName(profile), [profile]);
  const handle = useMemo(() => (profile?.username ? `@${profile.username}` : "@unknown"), [
    profile?.username,
  ]);

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
      .select("id,display_name,username,avatar_url")
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
      .select("id,title,location,event_date,event_end_date,image_url")
      .in("id", eventIds)
      .order("event_date", { ascending: true });

    if (eventsErr) {
      console.error(eventsErr);
      setUpcoming([]);
      setPastEvents([]);
      setLoading(false);
      return;
    }

    const rows = (events ?? []) as EventRow[];
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

  const coverStyle = {
    background:
      "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
  } as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white px-5 pt-6">
        <div className="text-zinc-400">Loadingâ€¦</div>
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
              Visible to friends (and friends-of-friends). Others see you after RSVP.
            </div>
          </div>

          {/* Stats (tight cluster + hints when zero) */}
          <div className="mt-7 flex items-center justify-center gap-10">
            <Stat value={eventsCount} label="Events" hint="RSVP to show up" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value={friendsCount} label="Friends" hint="Add 1 to unlock" />
          </div>

          {/* Actions */}
          <div className="mt-6 w-full max-w-md grid grid-cols-2 gap-3">
            <Link
              to="/profile/edit"
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-center font-semibold"
            >
              Edit profile
            </Link>

            <button
              onClick={() => {
                const username = profile?.username;
                if (!username) {
                  toast.error("Set a username first");
                  return;
                }
                const link = `${window.location.origin}/add/@${username}`;
                navigator.clipboard.writeText(link);
                toast.success("Invite link copied");
              }}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-center font-semibold hover:brightness-110 transition"
            >
              Copy invite
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 h-px bg-white/10" />

        {/* Upcoming */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5 text-zinc-400">
              No upcoming events yet.
              <div className="text-sm text-zinc-500 mt-1">
                RSVP to an event and it will show up here.
              </div>

              <div className="mt-4">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-white"
                >
                  Browse events
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
                    to={`/event/${e.id}`}
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

                        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-200">
                          Confirmed
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
                    to={`/event/${e.id}`}
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
    </div>
  );
}
