import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  image_url: string | null;
};

type AttendeeRow = {
  event_id: string;
  user_id: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const coverStyle = {
  background:
    "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
} as const;

function formatDate(value?: string | null) {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

function AvatarStack({
  urls,
  total,
  label,
}: {
  urls: string[];
  total: number;
  label?: string;
}) {
  const show = urls.slice(0, 3);
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

  const [onlyWithFriends, setOnlyWithFriends] = useState(
    localStorage.getItem("whozin_only_friends") === "true"
  );

  const [viewerId, setViewerId] = useState<string | null>(null);

  const [myGoing, setMyGoing] = useState<Set<string>>(new Set());

  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [friendAvatarsByEvent, setFriendAvatarsByEvent] = useState<Record<string, string[]>>({});
  const [friendCounts, setFriendCounts] = useState<Record<string, number>>({});
  const [othersCounts, setOthersCounts] = useState<Record<string, number>>({});
  const [othersAvatarsByEvent, setOthersAvatarsByEvent] = useState<Record<string, string[]>>({});

  const [othersAvatarPoolByEvent, setOthersAvatarPoolByEvent] = useState<Record<string, string[]>>({
  });

  const [badThumbs, setBadThumbs] = useState<Set<string>>(new Set());

  const [workingByEvent, setWorkingByEvent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localStorage.setItem("whozin_only_friends", String(onlyWithFriends));
  }, [onlyWithFriends]);

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
      .select("id,title,location,event_date,image_url")
      .order("event_date", { ascending: true });

    if (eErr) {
      console.error(eErr);
      toast.error("Failed to load events");
      setEvents([]);
      setLoading(false);
      return;
    }

    const rows = (eventData ?? []) as EventRow[];
    setEvents(rows);

    if (!uid) {
      setFriendIds(new Set());
      setMyGoing(new Set());
      setFriendAvatarsByEvent({});
      setFriendCounts({});
      setOthersCounts({});
      setOthersAvatarsByEvent({});
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
      .select("event_id,user_id, profiles(username,avatar_url)");

    if (aErr) {
      console.error(aErr);
      setMyGoing(new Set());
      setFriendAvatarsByEvent({});
      setFriendCounts({});
      setOthersCounts({});
      setOthersAvatarsByEvent({});
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
    const othersCountsMap: Record<string, number> = {};
    const othersAvatarsMap: Record<string, string[]> = {};
    const othersPoolMap: Record<string, string[]> = {};

    const friendTmp: Record<string, string[]> = {};
    const othersTmp: Record<string, string[]> = {};

    for (const a of attendees) {
      const eid = a.event_id;
      if (!eid) continue;

      const isViewer = a.user_id === uid;
      const isFriend = fset.has(a.user_id);
      const av = a.profiles?.avatar_url ?? "";

      if (isFriend) {
        friendCountsMap[eid] = (friendCountsMap[eid] ?? 0) + 1;
        if (av) (friendTmp[eid] ||= []).push(av);
        continue;
      }

      if (!isViewer) {
        othersCountsMap[eid] = (othersCountsMap[eid] ?? 0) + 1;
        if (av) (othersTmp[eid] ||= []).push(av);
      }
    }

    for (const eid of Object.keys(friendCountsMap)) {
      friendAvatarsMap[eid] = uniqKeepOrder(friendTmp[eid] ?? []).slice(0, 3);
    }

    for (const eid of Object.keys(othersCountsMap)) {
      const pool = uniqKeepOrder(othersTmp[eid] ?? []);
      othersPoolMap[eid] = pool;
      if (mySet.has(eid)) othersAvatarsMap[eid] = pool.slice(0, 3);
    }

    setFriendCounts(friendCountsMap);
    setFriendAvatarsByEvent(friendAvatarsMap);
    setOthersCounts(othersCountsMap);
    setOthersAvatarPoolByEvent(othersPoolMap);
    setOthersAvatarsByEvent(othersAvatarsMap);

    setLoading(false);
  };

  const filteredEvents = useMemo(() => {
    if (!onlyWithFriends) return events;
    return events.filter((e) => (friendCounts[e.id] ?? 0) > 0);
  }, [events, friendCounts, onlyWithFriends]);

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
      if (nextGoing) next[eventId] = pool.slice(0, 3);
      else delete next[eventId];
      return next;
    });
  };

  const toggleRsvp = async (eventId: string) => {
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

    const currentlyGoing = myGoing.has(eventId);
    const nextGoing = !currentlyGoing;

    setWorkingByEvent((m) => ({ ...m, [eventId]: true }));
    applyLocalRsvpChange(eventId, nextGoing);

    try {
      if (nextGoing) {
        const { error } = await supabase.from("attendees").insert({
          event_id: eventId,
          user_id: uid,
        });
        if (error) throw error;
        toast.success("RSVP added");
        track("rsvp_updated", { source: "home", action: "add", eventId });
      } else {
        const { error } = await supabase
          .from("attendees")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", uid);
        if (error) throw error;
        toast.message("RSVP removed");
        track("rsvp_updated", { source: "home", action: "remove", eventId });
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
              <h1 className="text-3xl font-bold tracking-tight">Upcoming Events</h1>
              <p className="text-zinc-400 mt-1">Do not miss who you should have met.</p>
            </div>

            <button
              onClick={() => setOnlyWithFriends((v) => !v)}
              className={`text-xs px-3 py-1 rounded-full border transition whitespace-nowrap ${
                onlyWithFriends
                  ? "bg-pink-600/20 border-pink-500/40 text-pink-400"
                  : "bg-white/5 border-white/10 text-zinc-400"
              }`}
            >
              {onlyWithFriends ? "Friends only" : "All events"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {filteredEvents.map((event) => {
          const hasImage = !!event.image_url && event.image_url.trim().length > 0;
          const thumbOk = !badThumbs.has(event.id);
          const showThumb = hasImage && thumbOk;

          const going = myGoing.has(event.id);
          const working = !!workingByEvent[event.id];

          const fCount = friendCounts[event.id] ?? 0;
          const oCount = othersCounts[event.id] ?? 0;

          const friendUrls = friendAvatarsByEvent[event.id] ?? [];
          const othersUrls = othersAvatarsByEvent[event.id] ?? [];

          return (
            <Link
              key={event.id}
              to={`/event/${event.id}`}
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

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
                          <div className="inline-flex items-center gap-1.5 max-w-full">
                            <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{formatDate(event.event_date)}</span>
                          </div>

                          <div className="inline-flex items-center gap-1.5 max-w-full">
                            <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{event.location ?? "TBD"}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={working}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void toggleRsvp(event.id);
                        }}
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition active:scale-[0.99] disabled:opacity-60 ${
                          going
                            ? "bg-green-500/15 border-green-500/30 text-green-200"
                            : "bg-gradient-to-r from-pink-600 to-purple-600 border-white/10 text-white"
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        {going ? "Going" : "RSVP"}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        {fCount > 0 ? (
                          <AvatarStack
                            urls={friendUrls}
                            total={fCount}
                            label={`${fCount} friend${fCount === 1 ? "" : "s"} going`}
                          />
                        ) : (
                          <div className="text-xs text-zinc-500">No friends going yet</div>
                        )}

                        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                          <div className="inline-flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-zinc-600" />
                            <span>{oCount} others</span>
                          </div>

                          {going && oCount > 0 ? (
                            <>
                              <span className="text-zinc-700">.</span>
                              <AvatarStack
                                urls={othersUrls}
                                total={oCount}
                                label="Others visible (unlocked)"
                              />
                            </>
                          ) : null}
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

        {filteredEvents.length === 0 ? (
          <div className="text-center text-zinc-500 mt-12">No matching events.</div>
        ) : null}
      </div>
    </div>
  );
}

