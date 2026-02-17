import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Ticket, Calendar, Share2, Users, MapPin, Clock, ArrowLeft, MoreHorizontal, MessageCircle } from "lucide-react";
import { EVENTS } from "../../data/mock";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = EVENTS.find(e => e.id === id) || EVENTS[0];
  const [notifyOpen, setNotifyOpen] = useState(false);

  if (!event) return <div className="text-white">Event not found</div>;

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header Image */}
      <div className="relative h-64 w-full">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
        >
            <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 -mt-12 relative z-10 pb-24">
        {/* Ticket Stub */}
        <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <h1 className="text-2xl font-bold leading-tight w-3/4">{event.title}</h1>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0">
                         {/* QR Code Placeholder */}
                         <div className="w-10 h-10 border-2 border-black border-dashed opacity-50" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-zinc-500 mt-0.5" />
                        <div>
                            <div className="font-bold">{event.date}</div>
                            <div className="text-sm text-zinc-500">Doors 9:00 PM</div>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-zinc-500 mt-0.5" />
                        <div>
                            <div className="font-bold">{event.location}</div>
                            <div className="text-sm text-zinc-500">123 Main St, Brooklyn, NY</div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-sm">
                    <div className="text-zinc-500">Provider</div>
                    <div className="flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        Ticketmaster
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-zinc-950 p-4 grid grid-cols-2 gap-3 border-t border-white/5">
                <button 
                    onClick={() => setNotifyOpen(true)}
                    className="col-span-2 py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                    <Users className="w-4 h-4" />
                    Notify Friends
                </button>
                <button className="py-3 bg-zinc-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors">
                    <Calendar className="w-4 h-4" />
                    Add to Cal
                </button>
                <button className="py-3 bg-zinc-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                </button>
            </div>
        </div>

        {/* Who's Going Section */}
        <div className="mt-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                Who's In (12)
            </h3>
            <div className="flex -space-x-3 overflow-hidden p-2">
                {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800" />
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                    +7
                </div>
            </div>
        </div>
      </div>

      <NotifyModal open={notifyOpen} onClose={() => setNotifyOpen(false)} eventName={event.title} />
    </div>
  );
}

function NotifyModal({ open, onClose, eventName }: { open: boolean, onClose: () => void, eventName: string }) {
    const [step, setStep] = useState<"select" | "preview" | "sent">("select");
    const [smsEnabled, setSmsEnabled] = useState(false);

    const handleSend = () => {
        if (smsEnabled) setStep("preview");
        else setStep("sent");
    };

    const handleConfirmSend = () => {
        setStep("sent");
        toast.success("Notifications sent!");
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl z-50 p-6 border-t border-white/10 max-h-[85vh] overflow-y-auto"
                    >
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />

                        {step === "select" && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold">Notify Friends</h2>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                                                <Users className="w-5 h-5 text-pink-500" />
                                            </div>
                                            <div>
                                                <div className="font-bold">Whozin Friends</div>
                                                <div className="text-xs text-zinc-400">In-app notification</div>
                                            </div>
                                        </div>
                                        <div className="w-12 h-7 bg-pink-500 rounded-full relative">
                                            <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-md" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                                <MessageCircle className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <div className="font-bold">Send SMS</div>
                                                <div className="text-xs text-zinc-400">Text your contacts</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSmsEnabled(!smsEnabled)}
                                            className={`w-12 h-7 rounded-full relative transition-colors ${smsEnabled ? "bg-blue-500" : "bg-zinc-700"}`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${smsEnabled ? "right-1" : "left-1"}`} />
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSend}
                                    className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-zinc-200 transition-colors active:scale-95"
                                >
                                    Continue
                                </button>
                                <p className="text-xs text-center text-zinc-600">We'll never text anyone without you tapping Send.</p>
                            </div>
                        )}

                        {step === "preview" && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold">Preview Message</h2>
                                
                                <div className="bg-blue-500 p-4 rounded-2xl rounded-tr-sm text-white relative max-w-[85%] ml-auto">
                                    <p>I'm going to {eventName}. Wanna join? – Whozin</p>
                                    <div className="text-[10px] text-blue-200 mt-1 text-right">Now</div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <button 
                                        onClick={handleConfirmSend}
                                        className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        Send Texts
                                        <MessageCircle className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setStep("select")}
                                        className="w-full py-4 text-zinc-500 font-medium hover:text-white transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === "sent" && (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-10 h-10 text-green-500" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Sent!</h2>
                                <p className="text-zinc-400 mb-8">Your friends have been notified.</p>
                                
                                <button 
                                    onClick={onClose}
                                    className="w-full py-4 bg-zinc-800 text-white rounded-xl font-bold text-lg hover:bg-zinc-700 transition-colors"
                                >
                                    Back to Ticket
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
