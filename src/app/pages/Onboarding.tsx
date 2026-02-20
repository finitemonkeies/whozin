import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Ticket, Users, ShieldCheck } from "lucide-react";
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

export function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();

  const redirect = sanitizeRedirectTarget(query.get("redirect"));

  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setChecking(true);

      const { data: sessionRes } = await supabase.auth.getSession();
      const user = sessionRes.session?.user;

      if (!user) {
        if (!cancelled) {
          setAuthed(false);
          setChecking(false);
        }
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("display_name,onboarding_complete")
        .eq("id", user.id)
        .single();

      const incomplete =
        error || !prof?.display_name || prof?.onboarding_complete !== true;

      if (!cancelled) {
        setAuthed(true);
        setChecking(false);
      }

      // If they’re already complete, don’t keep them on intro
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

  const handleContinue = () => {
    const next = encodeURIComponent(redirect);
    // Always route through login from intro so first-time users
    // explicitly enter auth before any setup/profile screen.
    navigate(`/login?redirect=${next}`);
  };

  return (
    <div className="min-h-[100svh] bg-black text-white px-6 relative overflow-hidden flex flex-col justify-center">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
      </div>

      <div className="relative max-w-md mx-auto w-full text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          Find your People
        </h1>

        <p className="text-zinc-400 text-base leading-relaxed mb-10">
          RSVP to the events you’re attending & instantly see which friends (and friends of friends) will be there.
        </p>

        {/* Glow background */}
        <div className="absolute inset-0 flex justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 blur-3xl" />
        </div>

        <div className="grid grid-cols-3 gap-3 relative">
          <MiniStep icon={<Ticket className="w-4 h-4 text-pink-200" />} title="RSVP" subtitle="1 tap" />
          <MiniStep icon={<Users className="w-4 h-4 text-purple-200" />} title="See who’s going" subtitle="friends + FOAF" />
          <MiniStep icon={<ShieldCheck className="w-4 h-4 text-emerald-200" />} title="Party safely" subtitle="you decide visibility" />
        </div>

        <button
          onClick={handleContinue}
          disabled={checking}
          className="mt-10 w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 transition active:scale-[0.98] disabled:opacity-60"
        >
          {checking ? "Loading…" : authed ? "Continue" : "Continue"}
        </button>

        {/* Optional microcopy while checking */}
        {checking ? (
          <div className="mt-3 text-xs text-white/40">Checking session…</div>
        ) : null}
      </div>
    </div>
  );
}

function MiniStep({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/45 border border-white/10 p-4 text-center">
      <div className="mx-auto w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-3 text-xs font-semibold leading-tight">{title}</div>
      <div className="mt-1 text-[11px] text-zinc-500 leading-tight">{subtitle}</div>
    </div>
  );
}
