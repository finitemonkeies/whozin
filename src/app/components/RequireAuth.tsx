// src/app/components/RequireAuth.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "@/app/providers/AuthProvider";

type ProfileGate = {
  username: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
};

type RequireAuthProps = {
  children: React.ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { loading: authLoading, user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<ProfileGate | null>(null);

  // Tracks whether we've ever completed a check. After first success,
  // we avoid blanking the UI (no more full-screen flicker).
  const hasResolvedOnceRef = useRef(false);

  const pathWithSearch = useMemo(
    () => location.pathname + location.search,
    [location.pathname, location.search]
  );

  const isSetupRoute = location.pathname === "/setup";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (authLoading) return;
      setChecking(true);

      if (!user) {
        if (!cancelled) {
          setAuthed(false);
          setProfile(null);
          setChecking(false);
          hasResolvedOnceRef.current = true;
        }
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("username,avatar_url,onboarding_complete")
        .eq("id", user.id)
        .single();

      if (!cancelled) {
        setAuthed(true);
        setProfile(
          error
            ? { username: null, avatar_url: null, onboarding_complete: false }
            : (prof as ProfileGate)
        );
        setChecking(false);
        hasResolvedOnceRef.current = true;
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Only show a full-screen loader on the very first load.
  // After that, keep rendering children to avoid flicker.
  const shouldBlockUI = checking && !hasResolvedOnceRef.current;

  if (shouldBlockUI) {
    return (
      <div className="min-h-[100svh] bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/70">Checking session…</div>
      </div>
    );
  }

  if (!authed) {
    const redirect = encodeURIComponent(pathWithSearch);
    return <Navigate to={`/intro?redirect=${redirect}`} replace />;
  }

  const needsSetup =
    !profile?.username || !profile?.avatar_url || profile?.onboarding_complete !== true;

  if (needsSetup && !isSetupRoute) {
    const redirect = encodeURIComponent(pathWithSearch);
    return <Navigate to={`/setup?redirect=${redirect}`} replace />;
  }

  // Optional: subtle top-loading bar while re-checking (no flicker)
  return (
    <>
      {checking ? (
        <div className="pointer-events-none fixed left-0 top-0 z-50 h-0.5 w-full bg-gradient-to-r from-pink-600/80 to-purple-600/80 opacity-60" />
      ) : null}
      {children}
    </>
  );
}
