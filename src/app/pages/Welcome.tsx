import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { WhozinLockup, WhozinLogo } from "../components/WhozinLogo";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

type ProfileGate = {
  username: string | null;
  avatar_url: string | null;
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
        .select("username,avatar_url,onboarding_complete")
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

      const incomplete =
        !prof?.username || !prof?.avatar_url || prof?.onboarding_complete !== true;

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
    navigate(`/setup?redirect=${next}`, { replace: true });
  };

  const onSignIn = () => {
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?redirect=${next}`, { replace: true });
  };

  const onSignUp = () => {
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/signup?redirect=${next}`, { replace: true });
  };

  return (
    <div className="whozin-brand-shell min-h-screen text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.16),rgba(0,0,0,0.68))]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="whozin-brand-card w-full max-w-sm z-10 flex flex-col items-center rounded-[32px] px-6 py-8"
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Private by default
        </div>
        <div className="mb-8">
          <WhozinLogo />
        </div>

        <h1 className="text-4xl font-bold text-center mb-3 tracking-[-0.03em]">
          See who's going.
        </h1>

        <p className="text-zinc-400 text-center mb-10 text-lg">
          {authed
            ? "You're almost in. One quick setup."
            : "Start with the social loop, then sign in when it clicks."}
        </p>

        <div className="whozin-brand-pill mb-8 flex items-center gap-3 rounded-full px-4 py-2 text-xs text-zinc-300">
          <div className="flex -space-x-2">
            {["S", "M", "A", "J"].map((letter, index) => (
              <span
                key={letter}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 text-[11px] font-bold text-white"
                style={{
                  background: `linear-gradient(${120 + index * 15}deg, #EC4899, #9333EA)`,
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <span>12 friends are going tonight</span>
        </div>

        <div className="w-full space-y-4">
          {authed ? (
            <button
              onClick={onContinue}
              disabled={checking || !needsSetup}
              className="whozin-brand-button flex w-full items-center justify-center rounded-2xl py-4 text-lg font-bold transition-all active:scale-95 disabled:opacity-60"
            >
              Continue
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  const next = encodeURIComponent(redirect);
                  navigate(`/intro?redirect=${next}`, { replace: true });
                }}
                className="whozin-brand-button flex w-full items-center justify-center rounded-2xl py-4 text-lg font-bold transition-all active:scale-95"
              >
                See How It Works
              </button>

              <div className="flex items-center justify-center gap-3 text-sm text-zinc-500">
                <button onClick={onSignIn} className="hover:text-white transition-colors">
                  Sign In
                </button>
                <span className="text-zinc-700">/</span>
                <button onClick={onSignUp} className="hover:text-white transition-colors">
                  Sign Up
                </button>
              </div>
            </>
          )}
        </div>

        {!authed ? (
          <div className="mt-8">
            <WhozinLockup
              iconClassName="w-9 h-9 rounded-[10px]"
              glyphClassName="w-5 h-5"
              wordmarkClassName="text-sm font-bold tracking-[-0.02em] text-zinc-300"
            />
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
