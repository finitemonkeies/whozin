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
      if (data.session?.user) {
        identifyAnalyticsUser({
          id: data.session.user.id,
          email: data.session.user.email ?? null,
          username:
            typeof data.session.user.user_metadata?.username === "string"
              ? data.session.user.user_metadata.username
              : null,
          provider:
            typeof data.session.user.app_metadata?.provider === "string"
              ? data.session.user.app_metadata.provider
              : null,
        });
        track("auth_session_bootstrap_success", {
          provider: data.session.user.app_metadata?.provider ?? "unknown",
        });
      } else {
        resetAnalyticsUser();
      }
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      // This fires during OAuth callback + future refreshes.
      setSession(newSession ?? null);
      if (newSession?.user) {
        identifyAnalyticsUser({
          id: newSession.user.id,
          email: newSession.user.email ?? null,
          username:
            typeof newSession.user.user_metadata?.username === "string"
              ? newSession.user.user_metadata.username
              : null,
          provider:
            typeof newSession.user.app_metadata?.provider === "string"
              ? newSession.user.app_metadata.provider
              : null,
        });
      } else {
        resetAnalyticsUser();
      }

      if (event === "SIGNED_IN" && newSession?.user) {
        track("login_success", {
          provider: newSession.user.app_metadata?.provider ?? "unknown",
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
