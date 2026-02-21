import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Share2,
  Ticket,
  Users,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  image_url: string | null;
  description?: string | null;
};

type AttendeeRow = {
  user_id: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

function formatEventDate(value?: string | null) {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isUuid(value: string) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

const RSVP_BUMP_KEY = "whozin_rsvp_bump";

function bumpRsvp() {
  localStorage.setItem(RSVP_BUMP_KEY, String(Date.now()));
}

export function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loadingFriendMap, setLoadingFriendMap] = useState(true);

  const [isGoing, setIsGoing] = useState(false);
  const [working, setWorking] = useState(false);

  const eventImage = useMemo(() => event?.image_url ?? "", [event?.image_url]);

  const friendsGoing = useMemo(() => {
    return attendees.filter((a) => friendIds.has(a.user_id));
  }, [attendees, friendIds]);

  const othersGoing = useMemo(() => {
    return attendees.filter((a) => !friendIds.has(a.user_id) && a.user_id !== viewerId);
  }, [attendees, friendIds, viewerId]);

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
      .select("user_id, profiles(username, avatar_url)")
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
        .select("id,title,location,event_date,image_url,description")
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

    const nextGoing = !isGoing;
    setWorking(true);
    setIsGoing(nextGoing);

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
        });
        if (error) throw error;

        toast.success("You are on the list.");
        track("rsvp_updated", { source: "event_details", action: "add", eventId: id });
      } else {
        const { error } = await supabase
          .from("attendees")
          .delete()
          .eq("event_id", id)
          .eq("user_id", uid);
        if (error) throw error;

        toast.message("RSVP removed");
        track("rsvp_updated", { source: "event_details", action: "remove", eventId: id });
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
        source: "event_details",
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

  return (
    <div className="bg-black min-h-screen pb-24 text-white">
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
          <button className="p-2 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-10 relative">
        <h1 className="text-3xl font-bold mb-2 leading-none drop-shadow-xl">{event.title}</h1>

        <div className="flex gap-4 my-6">
          <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div className="bg-purple-500/20 p-2.5 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Date</div>
              <div className="text-sm font-semibold">{formatEventDate(event.event_date)}</div>
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
          <button
            onClick={handleToggleGoing}
            disabled={working}
            className={`w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-60 ${
              isGoing
                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                : "bg-gradient-to-r from-pink-600 to-purple-600"
            }`}
          >
            <Ticket className="w-5 h-5" />
            {isGoing ? "Going (Tap to undo)" : "I'm Going"}
            {working && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
          </button>

          <p className="text-center text-xs text-zinc-500 mt-3">
            {isGoing ? "You can now see everyone going." : "RSVP to unlock more attendees."}
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Friends Going{" "}
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
                const name = a.profiles?.username ?? "Anon";
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
                const name = a.profiles?.username ?? "Anon";
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

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-8">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            Squad Chat
          </h3>
          <p className="text-sm text-zinc-400 mb-4">(MVP later) Chat for {event.title}.</p>
          <button className="w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-medium text-sm transition-colors border border-white/5">
            Join Chat Room
          </button>
        </div>

        <div className="text-zinc-500 text-sm leading-relaxed pb-8">
          <h3 className="text-white font-bold mb-2">About Event</h3>
          <p>{event.description ?? "No description yet."}</p>
        </div>
      </div>
    </div>
  );
}
