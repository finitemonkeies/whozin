import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { motion } from "motion/react";

export function DesktopLanding() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[720px] w-full text-center px-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-4 leading-[1.1]"
        >
          4 friends are going to <span className="text-blue-500">Subtronics.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl text-zinc-400 mb-10 font-medium"
        >
          See who’s going — before you go.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <Link 
            to="/web/auth" 
            className="px-8 py-4 bg-white text-black rounded-full text-lg font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
          >
            Join to See the List
          </Link>
          <Link 
            to="/web/auth" 
            className="text-sm text-zinc-500 hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4"
          >
            Already have an account? Sign in
          </Link>
        </motion.div>

        {/* Blurred Avatars */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex justify-center -space-x-4 mb-8"
        >
          {[1,2,3,4,5].map((i) => (
            <div 
              key={i} 
              className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 blur-sm overflow-hidden relative"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-zinc-700 to-zinc-600 opacity-50" />
            </div>
          ))}
        </motion.div>

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium bg-zinc-900/50 inline-flex px-4 py-2 rounded-full border border-zinc-800/50 backdrop-blur-sm">
          <Lock className="w-3 h-3" />
          <span>Private by default. No public profiles. No location tracking.</span>
        </div>
      </div>
    </div>
  );
}
