import { Link, useNavigate } from "react-router-dom";
import { Mail, Upload, ArrowRight, Forward } from "lucide-react";
import { motion } from "motion/react";

export function DesktopSync() {
  const navigate = useNavigate();

  const handleConnect = () => {
    navigate("/web/scanning");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
      <div className="max-w-[720px] w-full px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-4">Find Your Upcoming Shows</h1>
          <p className="text-zinc-400 mb-12 text-lg">Connect your email to automatically detect tickets.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button 
              onClick={handleConnect}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-zinc-800 transition-all hover:-translate-y-1 active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Connect Gmail</h3>
              <span className="px-6 py-2 bg-white text-black text-sm font-bold rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors">
                Connect
              </span>
            </button>

            <button 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-zinc-800 transition-all hover:-translate-y-1 active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Upload className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white">Upload Ticket PDF</h3>
              <span className="px-6 py-2 bg-zinc-800 text-zinc-300 text-sm font-bold rounded-full border border-zinc-700 group-hover:bg-white group-hover:text-black group-hover:border-transparent transition-colors">
                Upload
              </span>
            </button>

            <button 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-zinc-800 transition-all hover:-translate-y-1 active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Forward className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white">Forward Email</h3>
              <span className="px-6 py-2 bg-zinc-800 text-zinc-300 text-sm font-bold rounded-full border border-zinc-700 group-hover:bg-white group-hover:text-black group-hover:border-transparent transition-colors">
                Learn How
              </span>
            </button>
          </div>

          <Link 
            to="/web/match" 
            className="text-zinc-500 font-medium hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4"
          >
            Skip for now
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
