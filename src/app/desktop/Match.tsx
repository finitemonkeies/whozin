import { Link } from "react-router-dom";
import { ArrowLeft, Users, Calendar, MapPin, Ticket } from "lucide-react";
import { motion } from "motion/react";

export function DesktopMatch() {
  const friends = [
    { name: "Sarae", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" },
    { name: "Azeim", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
    { name: "Melissa", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80" }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-[600px] w-full px-6 text-center relative z-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight">
            You’re going to <span className="text-blue-500">Subtronics.</span>
        </h1>

        <div className="my-10 p-8 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-200 mb-8">
                <span className="text-blue-400">3 friends</span> are going too.
            </h2>
            
            <div className="flex justify-center gap-8 mb-4">
                {friends.map((friend, i) => (
                    <motion.div 
                        key={friend.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="flex flex-col items-center gap-3 group"
                    >
                        <div className="w-16 h-16 rounded-full p-1 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform duration-300 overflow-hidden bg-zinc-800">
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="font-medium text-sm text-zinc-300 group-hover:text-white transition-colors">{friend.name}</span>
                    </motion.div>
                ))}
            </div>
        </div>

        <div className="flex flex-col items-center gap-4">
            <Link 
                to="/web/event/subtronics" 
                className="px-8 py-4 bg-white text-black text-lg font-bold rounded-full hover:bg-zinc-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 flex items-center gap-2"
            >
                View Event
            </Link>
            <button className="text-zinc-500 font-medium hover:text-white transition-colors">
                Invite More Friends
            </button>
        </div>
      </motion.div>
    </div>
  );
}
