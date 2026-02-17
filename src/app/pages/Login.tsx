
import { useState } from "react";
import { supabase, getServerUrl } from "../../lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Zap, Mail, Lock, User, ArrowRight } from "lucide-react";

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        // Use server signup to auto-confirm and create profile
        const res = await fetch(getServerUrl("/signup"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");
        
        // Auto login after signup
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (loginError) throw loginError;

        toast.success("Account created! Welcome to the squad.");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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
            <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.5)]">
                    <Zap className="w-8 h-8 text-white fill-white" />
                </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center mb-2">{isLogin ? "Welcome Back" : "Join the Movement"}</h1>
            <p className="text-zinc-500 text-center mb-8 text-sm">
                {isLogin ? "Sync your tickets and find your squad." : "Create an account to start syncing tickets."}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Display Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
                            required
                        />
                    </div>
                )}
                
                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                        type="email" 
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
                        required
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(219,39,119,0.4)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            {isLogin ? "Sign In" : "Create Account"}
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
            </div>
        </motion.div>
    </div>
  );
}
