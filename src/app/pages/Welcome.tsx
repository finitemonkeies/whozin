import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { motion } from "motion/react";

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm z-10 flex flex-col items-center"
      >
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.4)] mb-8">
          <Zap className="w-10 h-10 text-white fill-white" />
        </div>

        {/* Headlines */}
        <h1 className="text-4xl font-bold text-center mb-3 tracking-tight">
          See who's going.
        </h1>
        <p className="text-zinc-500 text-center mb-12 text-lg">
          Sign in or create an account to get started.
        </p>

        {/* Buttons */}
        <div className="w-full space-y-4">
          <button
            onClick={() => navigate("/login")}
            className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(219,39,119,0.4)] hover:shadow-[0_0_30px_rgba(219,39,119,0.6)] transition-all active:scale-95 flex items-center justify-center"
          >
            Sign In
          </button>

          <button
            onClick={() => navigate("/signup")}
            className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-colors active:scale-95"
          >
            Sign Up
          </button>
        </div>
      </motion.div>
    </div>
  );
}
