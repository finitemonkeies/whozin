import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { supabase } from "@/lib/supabase";
import { track, trackError } from "@/lib/analytics";
import { featureFlags } from "@/lib/featureFlags";
import { syncSpotifyTasteFromSession } from "@/lib/spotify";
import { toast } from "sonner";
import { resolveFirstSessionRoute } from "@/lib/firstSessionRoute";
import { syncPendingMarketingEmailPreference } from "@/lib/emailPreferences";

type ProfileGate = {
  username: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
};

async function resolvePostAuthRoute(redirect: string, userId: string): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username,avatar_url,onboarding_complete")
    .eq("id", userId)
    .maybeSingle();

  const needsSetup =
    !!error ||
    !profile ||
    !((profile as ProfileGate).username?.trim()) ||
    !((profile as ProfileGate).avatar_url?.trim()) ||
    (profile as ProfileGate).onboarding_complete !== true;

  if (needsSetup) {
    return `/setup?redirect=${encodeURIComponent(redirect)}`;
  }

  return resolveFirstSessionRoute(redirect);
}

/**
 * Central OAuth landing page.
 * Supabase parses the URL and exchanges the code automatically (detectSessionInUrl: true).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        const errorDescription =
          params.get("error_description") ||
          params.get("error") ||
          params.get("message");

        if (errorDescription) {
          track("auth_callback_failed", {
            stage: "provider_redirect",
            reason: errorDescription,
          });
          toast.error("Login failed", { description: errorDescription });
          navigate("/login");
          return;
        }

        const start = Date.now();
        const timeoutMs = 8000;

        while (Date.now() - start < timeoutMs) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && isMounted) {
            await syncPendingMarketingEmailPreference({
              userId: data.session.user.id,
              email: data.session.user.email ?? null,
              source: "auth_callback",
            }).catch(() => null);

            if (featureFlags.spotifyRecommendationsEnabled) {
              // Capture Spotify taste after OAuth callback while provider token is fresh.
              await syncSpotifyTasteFromSession().catch(() => null);
            }

            const redirect = sanitizeRedirectTarget(localStorage.getItem("whozin_post_auth_redirect"));
            localStorage.removeItem("whozin_post_auth_redirect");
            const nextRoute = await resolvePostAuthRoute(redirect, data.session.user.id);
            track("auth_callback_success", { redirect: nextRoute });
            navigate(nextRoute, { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        track("auth_callback_failed", {
          stage: "session_timeout",
          timeoutMs,
        });
        toast.error("Login timed out", {
          description: "Session not established. Try again.",
        });
        navigate("/login", { replace: true });
      } catch (err) {
        trackError("auth_callback_exception", err);
        toast.error("Login failed", { description: "Unexpected callback error. Try again." });
        navigate("/login", { replace: true });
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [navigate, params]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Signing you in...</h2>
      <p>This usually takes a few seconds.</p>
    </div>
  );
}
