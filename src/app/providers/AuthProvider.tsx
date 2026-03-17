import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { identifyAnalyticsUser, resetAnalyticsUser, track, trackError } from "@/lib/analytics";

type AuthState = {
  loading: boolean;
  session: any | null;
  user: any | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function runNonCritical(task: () => void) {
  if (typeof window === "undefined") {
    task();
    return;
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(task, { timeout: 1500 });
    return;
  }

  window.setTimeout(task, 0);
}

function syncAnalyticsForSession(session: any | null) {
  runNonCritical(() => {
    if (session?.user) {
      identifyAnalyticsUser({
        id: session.user.id,
        email: session.user.email ?? null,
        username:
          typeof session.user.user_metadata?.username === "string"
            ? session.user.user_metadata.username
            : null,
        provider:
          typeof session.user.app_metadata?.provider === "string"
            ? session.user.app_metadata.provider
            : null,
      });
      track("auth_session_bootstrap_success", {
        provider: session.user.app_metadata?.provider ?? "unknown",
      });
      return;
    }

    resetAnalyticsUser();
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.error("[auth.getSession]", error);
        trackError("auth_session_bootstrap_error", error);
      }

      setSession(data.session ?? null);
      setLoading(false);
      syncAnalyticsForSession(data.session ?? null);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      // This fires during OAuth callback + future refreshes.
      setSession(newSession ?? null);
      syncAnalyticsForSession(newSession ?? null);

      if (event === "SIGNED_IN" && newSession?.user) {
        runNonCritical(() => {
          track("login_success", {
            provider: newSession.user.app_metadata?.provider ?? "unknown",
          });
        });
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
