import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Smartphone, Mail, Command } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function DesktopAuth() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const navigate = useNavigate();

  const handleSendCode = () => {
    setStep("otp");
  };

  const handleVerify = () => {
    navigate("/web/sync");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
      <div className="w-full max-w-[480px] px-6">
        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
            >
              <h1 className="text-2xl font-bold mb-6 text-center">Join Whozin</h1>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                  <input 
                    type="tel" 
                    placeholder="(555) 123-4567" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button 
                onClick={handleSendCode}
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors mb-6 active:scale-[0.98]"
              >
                Send Code
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute w-full h-px bg-zinc-800" />
                <span className="relative bg-zinc-900 px-3 text-xs text-zinc-500 font-medium uppercase">or</span>
              </div>

              <button className="w-full py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 border border-zinc-700/50">
                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs">G</span>
                Continue with Google
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center"
            >
              <h1 className="text-2xl font-bold mb-2">Enter Code</h1>
              <p className="text-zinc-500 text-sm mb-8">We sent a code to (555) 123-4567</p>
              
              <div className="flex gap-2 justify-center mb-8">
                {[1,2,3,4,5,6].map((i) => (
                  <input 
                    key={i}
                    type="text" 
                    maxLength={1}
                    className="w-12 h-14 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-xl font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                ))}
              </div>

              <button 
                onClick={handleVerify}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors mb-4 active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                Verify
              </button>
              
              <button 
                onClick={() => setStep("phone")}
                className="text-sm text-zinc-500 hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4"
              >
                Change phone number
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
