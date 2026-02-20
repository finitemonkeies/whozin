import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

type ProfileGate = {
  display_name: string | null;
  onboarding_complete: boolean;
};

export function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();

  const redirect = sanitizeRedirectTarget(query.get("redirect"));

  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setChecking(true);

      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes.session?.user;

      if (!user) {
        if (!cancelled) {
          setAuthed(false);
          setNeedsSetup(false);
          setChecking(false);
        }
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("display_name,onboarding_complete")
        .eq("id", user.id)
        .single();

      if (error) {
        if (!cancelled) {
          setAuthed(true);
          setNeedsSetup(true);
          setChecking(false);
        }
        return;
      }

      const incomplete = !prof?.display_name || prof?.onboarding_complete !== true;

      if (!cancelled) {
        setAuthed(true);
        setNeedsSetup(incomplete);
        setChecking(false);
      }

      // If they’re already complete, don’t block them on Welcome
      if (!incomplete) {
        navigate(redirect, { replace: true });
      }
    }

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  const onContinue = () => {
    // Preserve the original redirect all the way through setup
    const next = encodeURIComponent(redirect);
    navigate(`/setup?redirect=${next}`);
  };

  const onSignIn = () => {
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?redirect=${next}`);
  };

  const onSignUp = () => {
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/signup?redirect=${next}`);
  };

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
          {authed
            ? "You're almost in. One quick setup."
            : "Sign in or create an account to get started."}
        </p>

        {/* Buttons */}
        <div className="w-full space-y-4">
          {authed ? (
            <button
              onClick={onContinue}
              disabled={checking || !needsSetup}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(219,39,119,0.4)] hover:shadow-[0_0_30px_rgba(219,39,119,0.6)] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center"
            >
              Continue
            </button>
          ) : (
            <>
              <button
                onClick={onSignIn}
                className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(219,39,119,0.4)] hover:shadow-[0_0_30px_rgba(219,39,119,0.6)] transition-all active:scale-95 flex items-center justify-center"
              >
                Sign In
              </button>

              <button
                onClick={onSignUp}
                className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-colors active:scale-95"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
