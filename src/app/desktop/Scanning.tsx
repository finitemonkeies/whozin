import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function DesktopScanning() {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate scan
    setTimeout(() => {
      navigate("/web/match");
    }, 3000);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center text-center"
      >
        <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            />
            <div className="absolute w-16 h-16 bg-blue-500/10 rounded-full blur-xl" />
        </div>

        <h1 className="text-3xl font-bold mb-2">Scanning your inbox...</h1>
        <p className="text-zinc-500 text-lg">This takes about 10 seconds.</p>
      </motion.div>
    </div>
  );
}
