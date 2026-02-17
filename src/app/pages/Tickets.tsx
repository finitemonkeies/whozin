import { useState, useEffect } from "react";
import { Ticket as TicketIcon, Plus, Calendar, MapPin, Loader2, ArrowRight } from "lucide-react";
import { EVENTS } from "../../data/mock";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function Tickets() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Simulate loading tickets
  useEffect(() => {
    // Check if we came from onboarding
    const justOnboarded = localStorage.getItem("just_onboarded") === "true";
    
    setTimeout(() => {
        if (justOnboarded) {
            setTickets(EVENTS.slice(0, 2));
            localStorage.removeItem("just_onboarded");
            setShowNewTicketModal(true); // Trigger "New Ticket Found" modal
        } else {
            // Default to empty state for demo if not coming from onboarding flow
            // or show existing tickets if user has used app before
            const hasTickets = localStorage.getItem("has_tickets") === "true";
            if (hasTickets) setTickets(EVENTS.slice(0, 1));
            else setTickets([]);
        }
        setLoading(false);
    }, 1000);
  }, []);

  const handleManualSync = () => {
    setLoading(true);
    setTimeout(() => {
        setTickets(EVENTS.slice(0, 2));
        setLoading(false);
        localStorage.setItem("has_tickets", "true");
        setShowNewTicketModal(true);
        toast.success("Sync complete!");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Wallet</h1>
        <button 
            onClick={handleManualSync}
            disabled={loading}
            className="p-2 bg-zinc-900 border border-white/10 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Checking for tickets...</p>
          </div>
      ) : tickets.length > 0 ? (
          <div className="flex flex-col gap-4">
            {tickets.map(event => (
                <div 
                    key={event.id} 
                    onClick={() => navigate(`/tickets/${event.id}`)}
                    className="relative overflow-hidden bg-zinc-900 border border-white/10 rounded-3xl cursor-pointer hover:border-pink-500/50 transition-all active:scale-[0.98]"
                >
                    {/* Visual stub effect */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 bg-black rounded-full border border-white/10 z-20" />
                    <div className="absolute top-1/2 -right-3 w-6 h-6 bg-black rounded-full border border-white/10 z-20" />
                    
                    <div className="p-6 relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="font-bold text-xl leading-tight w-2/3">{event.title}</h2>
                                <p className="text-zinc-500 text-sm mt-1">{event.location}</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                 {/* QR Code Placeholder */}
                                 <div className="w-10 h-10 border-2 border-black border-dashed opacity-50" />
                            </div>
                        </div>

                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Date</div>
                                <div className="font-mono text-pink-400">{event.date}</div>
                            </div>
                            <div className="text-right">
                                 <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Order ID</div>
                                 <div className="font-mono text-zinc-300">#829391</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Decorative background gradient */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>
            ))}
          </div>
      ) : (
          <EmptyState onSync={handleManualSync} />
      )}

      {/* New Ticket Detected Modal */}
      <AnimatePresence>
        {showNewTicketModal && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
                    onClick={() => setShowNewTicketModal(false)}
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-zinc-900 border border-white/10 p-6 rounded-3xl z-50 shadow-2xl shadow-pink-500/20"
                >
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30">
                            <TicketIcon className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">New Ticket Detected! 🎟️</h2>
                        <p className="text-zinc-400 mb-6">
                            You're going to <span className="text-white font-bold">Afterlife NY</span> on Nov 10.
                        </p>

                        <div className="space-y-3">
                            <button 
                                onClick={() => { setShowNewTicketModal(false); navigate("/tickets/r1"); }}
                                className="w-full py-3 bg-white text-black rounded-xl font-bold text-lg hover:bg-zinc-200 transition-colors active:scale-95"
                            >
                                Notify Friends
                            </button>
                            <button 
                                onClick={() => setShowNewTicketModal(false)}
                                className="w-full py-3 text-zinc-500 font-medium hover:text-white transition-colors"
                            >
                                Keep Private
                            </button>
                        </div>
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onSync }: { onSync: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                <TicketIcon className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your tickets</h2>
            <p className="text-zinc-500 max-w-xs mb-8">When you buy a ticket, it'll show up here automatically.</p>
            
            <button 
                onClick={onSync}
                className="px-8 py-3 bg-white text-black rounded-full font-bold text-lg hover:bg-zinc-200 transition-colors active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
                <Plus className="w-5 h-5" />
                Sync Tickets
            </button>
            
            <button className="mt-6 text-sm text-zinc-600 hover:text-zinc-400 underline decoration-zinc-700 underline-offset-4">
                How to add tickets manually
            </button>
        </div>
    );
}
