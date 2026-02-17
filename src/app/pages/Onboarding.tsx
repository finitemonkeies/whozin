import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Users, Music, Mail, Ticket, Copy, Loader2, Link } from "lucide-react";
import { toast } from "sonner";

// Steps in the onboarding flow
type Step = "contacts" | "spotify" | "sync-hub" | "syncing" | "success";

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("contacts");
  
  // State for sync simulation
  const [provider, setProvider] = useState<string | null>(null);

  const nextStep = (target: Step) => {
    setStep(target);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden flex flex-col">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
        <motion.div 
            className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
            animate={{ 
                width: step === "contacts" ? "20%" : 
                       step === "spotify" ? "40%" :
                       step === "sync-hub" ? "60%" :
                       step === "syncing" ? "80%" : "100%"
            }} 
        />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
            {step === "contacts" && <ContactsStep onNext={() => nextStep("spotify")} />}
            {step === "spotify" && <SpotifyStep onNext={() => nextStep("sync-hub")} />}
            {step === "sync-hub" && <SyncHubStep onConnect={(p) => { setProvider(p); nextStep("syncing"); }} />}
            {step === "syncing" && <SyncingStep provider={provider} onComplete={() => nextStep("success")} />}
            {step === "success" && <SuccessStep onFinish={() => navigate("/tickets")} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ContactsStep({ onNext }: { onNext: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
        >
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <Users className="w-10 h-10 text-blue-400" />
            </div>
            
            <h1 className="text-3xl font-bold mb-3">Find your friends</h1>
            <p className="text-zinc-400 mb-12">Connect your address book to see who else is going to events.</p>

            <div className="space-y-4">
                <button onClick={onNext} className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-colors active:scale-95">
                    Allow Contacts
                </button>
                <button onClick={onNext} className="w-full py-4 text-zinc-500 font-medium hover:text-white transition-colors">
                    Not now
                </button>
            </div>
            
            <p className="text-xs text-zinc-600 mt-8">We never message anyone without your permission.</p>
        </motion.div>
    );
}

function SpotifyStep({ onNext }: { onNext: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
        >
            <div className="w-20 h-20 bg-[#1DB954]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(29,185,84,0.3)]">
                <Music className="w-10 h-10 text-[#1DB954]" />
            </div>
            
            <h1 className="text-3xl font-bold mb-3">Connect Spotify</h1>
            <p className="text-zinc-400 mb-12">Optional—used to personalize your experience and event recommendations.</p>

            <div className="space-y-4">
                <button onClick={onNext} className="w-full py-4 bg-[#1DB954] text-black rounded-2xl font-bold text-lg hover:bg-[#1ed760] transition-colors active:scale-95 flex items-center justify-center gap-2">
                    <Music className="w-5 h-5 fill-black" />
                    Connect Spotify
                </button>
                <button onClick={onNext} className="w-full py-4 text-zinc-500 font-medium hover:text-white transition-colors">
                    Skip
                </button>
            </div>
        </motion.div>
    );
}

function SyncHubStep({ onConnect }: { onConnect: (p: string) => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
        >
            <h1 className="text-3xl font-bold mb-2 text-center">Sync your tickets</h1>
            <p className="text-zinc-400 mb-8 text-center">We'll automatically detect new tickets.</p>

            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Connect Provider</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {['Ticketmaster', 'AXS', 'Dice', 'SeatGeek'].map(p => (
                            <button 
                                key={p}
                                onClick={() => onConnect(p)}
                                className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-zinc-800 hover:border-white/20 transition-all active:scale-95"
                            >
                                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                                    <Ticket className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-medium text-sm">{p}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-black text-zinc-500">OR</span>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5 text-pink-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-white">Forward emails</h3>
                            <p className="text-xs text-zinc-400 mt-1">Forward your ticket confirmation emails to:</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono truncate">
                            tickets@whozin.app
                        </div>
                        <button 
                            onClick={() => toast.success("Copied to clipboard")}
                            className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function SyncingStep({ provider, onComplete }: { provider: string | null, onComplete: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-sm text-center"
        >
            <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Link className="w-8 h-8 text-zinc-500" />
                </div>
            </div>
            
            <h2 className="text-xl font-bold mb-2">Connecting to {provider}...</h2>
            <p className="text-zinc-500">This usually takes a few seconds.</p>
        </motion.div>
    );
}

function SuccessStep({ onFinish }: { onFinish: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center"
        >
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                <Check className="w-12 h-12 text-black stroke-[3]" />
            </div>
            
            <h1 className="text-3xl font-bold mb-3">You're synced!</h1>
            <p className="text-zinc-400 mb-12">We found 2 upcoming tickets. We'll automatically detect new ones as they arrive.</p>

            <button 
                onClick={() => {
                    localStorage.setItem("just_onboarded", "true");
                    onFinish();
                }}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-colors active:scale-95 flex items-center justify-center gap-2"
            >
                Continue
                <ArrowRight className="w-5 h-5" />
            </button>
        </motion.div>
    );
}
