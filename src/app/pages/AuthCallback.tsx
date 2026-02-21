import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

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
      const errorDescription =
        params.get("error_description") ||
        params.get("error") ||
        params.get("message");

      if (errorDescription) {
        toast.error("Login failed", { description: errorDescription });
        navigate("/login");
        return;
      }

      const start = Date.now();
      const timeoutMs = 8000;

      while (Date.now() - start < timeoutMs) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user && isMounted) {
          const redirect = sanitizeRedirectTarget(
            localStorage.getItem("whozin_post_auth_redirect")
          );
          localStorage.removeItem("whozin_post_auth_redirect");
          track("auth_callback_success", { redirect });
          navigate(redirect);
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      toast.error("Login timed out", {
        description: "Session not established. Try again.",
      });
      navigate("/login");
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
