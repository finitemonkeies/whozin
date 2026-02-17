import { Link } from "react-router-dom";
import { ArrowRight, Ticket, Users } from "lucide-react";
import { motion } from "motion/react";

export function DesktopNoMatch() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-[480px] w-full px-6 text-center"
      >
        <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <Ticket className="w-10 h-10 text-zinc-700" />
            <div className="absolute top-0 right-0 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border-4 border-zinc-950">
                <span className="text-xs font-bold text-zinc-500">1</span>
            </div>
        </div>

        <h1 className="text-3xl font-bold mb-4">You’re the first one going.</h1>
        <p className="text-zinc-500 text-lg mb-10">Invite your crew so this works.</p>

        <div className="space-y-4">
            <button className="w-full py-4 bg-white text-black text-lg font-bold rounded-full hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Invite Friends
            </button>
            <Link 
                to="/web/tickets" 
                className="block text-zinc-500 font-medium hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4"
            >
                Go to My Tickets
            </Link>
        </div>
      </motion.div>
    </div>
  );
}
