import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SignUp() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
        toast.error("Please enter a valid phone number.");
        return;
    }
    
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
        setLoading(false);
        toast.success("Verification code sent!");
        // Redirect to Onboarding instead of Home
        navigate("/onboarding");
    }, 1500);
  };

  const socialLogin = (provider: string) => {
      toast.info(`Connecting to ${provider}...`);
      // Simulate social auth
      setTimeout(() => {
          navigate("/onboarding");
      }, 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        <button 
            onClick={() => navigate("/welcome")}
            className="mb-8 text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
        >
            ← Back
        </button>

        <h1 className="text-3xl font-bold mb-2 tracking-tight">Create your account</h1>
        <p className="text-zinc-500 mb-8">Enter your phone number to get started.</p>

        {/* Phone Input Form */}
        <form onSubmit={handlePhoneSubmit} className="space-y-4 mb-8">
            <div className="flex gap-3">
                <div className="w-24 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-center gap-1 px-2 cursor-pointer hover:bg-zinc-800 transition-colors">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-medium text-sm">+1</span>
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg shadow-lg shadow-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-zinc-100 disabled:opacity-70 disabled:scale-100"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        Continue with Phone
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>

        {/* Divider */}
        <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-zinc-500">or continue with</span>
            </div>
        </div>

        {/* Social Buttons */}
        <div className="space-y-3">
            <SocialButton 
                icon={<InstagramIcon />} 
                label="Continue with Instagram" 
                onClick={() => socialLogin("Instagram")} 
            />
            <SocialButton 
                icon={<GoogleIcon />} 
                label="Continue with Google" 
                onClick={() => socialLogin("Google")} 
            />
            <SocialButton 
                icon={<AppleIcon />} 
                label="Continue with Apple" 
                onClick={() => socialLogin("Apple")} 
            />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-zinc-600">
            By continuing, you agree to our <a href="#" className="underline hover:text-zinc-400">Terms</a> & <a href="#" className="underline hover:text-zinc-400">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}

function SocialButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="w-full py-3.5 px-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-center gap-3 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all active:scale-[0.99]"
        >
            {icon}
            {label}
        </button>
    );
}

// Icons
const InstagramIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
);

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
    </svg>
);

const AppleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.64 3.75-1.64 2.05.07 3.3.69 4.25 2.19-1.24.7-2.12 1.83-2.12 3.5 0 2.37 1.95 3.36 2.35 3.5-1.75 3.5-3.08 4.74-3.31 4.68zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.16 2.22-1.64 4.09-3.74 4.25z"/>
    </svg>
);
