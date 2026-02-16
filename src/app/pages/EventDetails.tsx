
import { useParams, Link, useNavigate } from "react-router-dom";
import { EVENTS } from "../../data/mock";
import { ArrowLeft, Calendar, MapPin, Share2, Ticket, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, getServerUrl } from "../../lib/supabase";

export function EventDetails() {
  const { id } = useParams();
  const event = EVENTS.find((e) => e.id === id);
  const [isSynced, setIsSynced] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const navigate = useNavigate();

  if (!event) return <div className="text-white p-10">Event not found</div>;

  useEffect(() => {
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Check sync status
        if (session) {
            try {
                const res = await fetch(getServerUrl(`/event/${id}/check-sync`), {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                const data = await res.json();
                setIsSynced(data.synced);
            } catch (e) {
                console.error(e);
            }
        }
        
        // Fetch attendees
        try {
            const res = await fetch(getServerUrl(`/event/${id}/attendees`));
            const data = await res.json();
            if (Array.isArray(data)) {
                setAttendees(data);
            }
        } catch (e) {
            console.error(e);
        }
    };
    init();
  }, [id]);

  const handleSync = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        toast.error("Sign in to sync tickets");
        navigate("/login");
        return;
    }

    setShowSyncModal(true);
    try {
        const res = await fetch(getServerUrl("/rsvp"), {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}` 
            },
            body: JSON.stringify({ eventId: id })
        });
        
        if (!res.ok) throw new Error("Sync failed");
        
        setIsSynced(true);
        toast.success("Ticket verified! You're on the list.");
        
        // Refresh attendees
        const attRes = await fetch(getServerUrl(`/event/${id}/attendees`));
        const attData = await attRes.json();
        if (Array.isArray(attData)) setAttendees(attData);

    } catch (err) {
        toast.error("Failed to sync ticket");
    } finally {
        setShowSyncModal(false);
    }
  };

  return (
    <div className="bg-black min-h-screen pb-24 text-white">
      {/* Header Image */}
      <div className="relative h-72">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <Link to="/" className="p-2 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
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
                    <div className="text-sm font-semibold">{event.date}</div>
                </div>
            </div>
            <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                <div className="bg-pink-500/20 p-2.5 rounded-xl">
                    <MapPin className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                    <div className="text-xs text-zinc-400">Location</div>
                    <div className="text-sm font-semibold">{event.location}</div>
                </div>
            </div>
        </div>

        {/* Action Button */}
        <div className="mb-8">
            {isSynced ? (
                <div className="w-full py-4 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center justify-center gap-2 text-green-400 font-bold">
                    <Ticket className="w-5 h-5" />
                    Ticket Synced & Verified
                </div>
            ) : (
                <button 
                    onClick={handleSync}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(219,39,119,0.4)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 relative overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <Ticket className="w-5 h-5" />
                        Sync Ticket
                    </span>
                    {showSyncModal && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                </button>
            )}
            <p className="text-center text-xs text-zinc-500 mt-3">
                Sync your ticket to see who's going and join squads.
            </p>
        </div>

        {/* Who's In Section */}
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Who's In <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{attendees.length}</span>
                </h2>
                {attendees.length > 0 && <button className="text-pink-500 text-sm font-medium">View All</button>}
            </div>

            {attendees.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {attendees.map((user) => (
                        <div key={user.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                            <div className="relative">
                                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-zinc-800" />
                                {user.verified && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 p-0.5 rounded-full border-2 border-black">
                                        <Users className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-zinc-300 font-medium truncate w-full text-center">{user.name}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
                    <p className="text-sm text-zinc-500">No one has synced yet. Be the first!</p>
                </div>
            )}
        </div>

        {/* Squads / Chat */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-8">
            <h3 className="font-bold mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                Squad Chat
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
                Join the official chat for {event.title} to coordinate with others.
            </p>
            <button className="w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-medium text-sm transition-colors border border-white/5">
                Join Chat Room
            </button>
        </div>

        <div className="text-zinc-500 text-sm leading-relaxed pb-8">
            <h3 className="text-white font-bold mb-2">About Event</h3>
            <p>{event.description}</p>
        </div>
      </div>

      <AnimatePresence>
        {showSyncModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            >
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="font-bold text-lg mb-1">Verifying Ticket...</h3>
                    <p className="text-zinc-400 text-sm text-center">Connecting to ticket provider to verify your purchase.</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
