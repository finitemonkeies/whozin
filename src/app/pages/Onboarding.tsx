import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { track } from "@/lib/analytics";
import { FriendsGoingIcon, InviteIcon, RSVPIcon } from "@/app/components/WhozinIcons";
import { WhozinLockup } from "@/app/components/WhozinLogo";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

type ProfileGate = {
  username: string | null;
  avatar_url: string | null;
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
        .select("username,avatar_url,onboarding_complete")
        .eq("id", user.id)
        .single();

      const incomplete =
        error || !prof?.username || !prof?.avatar_url || prof?.onboarding_complete !== true;

      if (!cancelled) {
        setAuthed(true);
        setChecking(false);
      }

      // If they are already complete, do not keep them on intro.
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
    track("intro_continue_clicked", {
      redirect,
      first_session_path: "friend_then_rsvp_then_invite",
    });
    // Always route through login from intro so first-time users
    // explicitly enter auth before any setup/profile screen.
    navigate(`/login?redirect=${next}`, { replace: true });
  };

  return (
    <div className="whozin-brand-shell min-h-[100svh] text-white px-6 relative overflow-hidden flex flex-col justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
      </div>

      <div className="whozin-brand-card relative max-w-md mx-auto w-full rounded-[32px] px-6 py-8 text-center">
        <div className="mb-6 flex justify-center">
          <WhozinLockup
            iconClassName="w-10 h-10 rounded-[12px]"
            glyphClassName="w-6 h-6"
            wordmarkClassName="text-base font-bold tracking-[-0.02em] text-white"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Start With Friends</h1>

        <p className="text-zinc-400 text-base leading-relaxed mb-10">
          Add one real friend, find one move, and Whozin starts feeling useful fast.
        </p>

        <div className="absolute inset-0 flex justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-[linear-gradient(135deg,rgba(236,72,153,0.2),rgba(168,85,247,0.18),rgba(147,51,234,0.2))] blur-3xl" />
        </div>

        <div className="grid grid-cols-3 gap-3 relative">
          <MiniStep icon={<FriendsGoingIcon color="currentColor" className="h-[18px] w-[18px] text-pink-200" />} title="Add a friend" subtitle="start with friends" />
          <MiniStep icon={<RSVPIcon color="currentColor" className="h-[18px] w-[18px] text-purple-200" />} title="Find a move" subtitle="pick one worth it" />
          <MiniStep icon={<InviteIcon color="currentColor" className="h-[18px] w-[18px] text-emerald-200" />} title="Share once" subtitle="invite a friend" />
        </div>

        <button
          onClick={handleContinue}
          disabled={checking}
          className="whozin-brand-button mt-10 w-full rounded-2xl py-4 text-lg font-bold transition active:scale-[0.98] disabled:opacity-60"
        >
          {checking ? "Loading..." : "Find your next move"}
        </button>

        <div className="mt-3 text-xs text-white/50">Private by default. Made for real moves with real friends.</div>
        <div className="mt-1 text-xs text-white/35">Friend -&gt; I&apos;m going -&gt; invite</div>
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
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        {icon}
      </div>
      <div className="mt-3 text-xs font-semibold leading-tight">{title}</div>
      <div className="mt-1 text-[11px] text-zinc-500 leading-tight">{subtitle}</div>
    </div>
  );
}
