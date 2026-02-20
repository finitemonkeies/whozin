import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, getSupabaseProjectRef } from "@/lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { toast } from "sonner";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Login() {
  const query = useQuery();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<null | "google" | "facebook" | "magic">(null);
  const [email, setEmail] = useState("");

  // Cooldown to avoid OTP 429 during dev loops
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const redirect = sanitizeRedirectTarget(query.get("redirect"));

  // Must match App route: <Route path="/auth/callback" ... />
  const callbackUrl = `${window.location.origin}/auth/callback`;

  const startCooldown = (seconds: number) => {
    if (cooldownTimerRef.current) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setCooldownSeconds(seconds);

    cooldownTimerRef.current = window.setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) {
          if (cooldownTimerRef.current) {
            window.clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startOAuth = async (provider: "google" | "facebook") => {
    try {
      setLoading(provider);

      // Persist redirect across full-page OAuth hops
      localStorage.setItem("whozin_post_auth_redirect", redirect);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl },
      });

      if (error) {
        const msg = error.message || "OAuth failed";
        if (msg.toLowerCase().includes("provider is not enabled")) {
          toast.error("Provider not enabled in Supabase", {
            description:
              "Either this frontend points at the wrong Supabase project, or the provider isn’t enabled in Supabase Auth settings.",
          });
        } else {
          toast.error("Login failed", { description: msg });
        }
        setLoading(null);
        return;
      }

      if (data?.url) window.location.assign(data.url);
    } catch (e: any) {
      toast.error("Login failed", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const startMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email");
      return;
    }

    if (loading || cooldownSeconds > 0) return;

    try {
      setLoading("magic");
      localStorage.setItem("whozin_post_auth_redirect", redirect);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: callbackUrl },
      });

      if (error) {
        const msg = (error as any)?.message || "Unknown error";

        // Supabase can return 429 here when OTP is spammed in dev.
        // Message formatting varies, so we check loosely.
        const isRateLimit =
          msg.includes("429") ||
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("too many") ||
          msg.toLowerCase().includes("over_email_send_rate_limit");

        if (isRateLimit) {
          startCooldown(25);
          toast.error("Slow down a sec", {
            description: "You hit an email send limit. Wait a moment, then try again.",
          });
        } else {
          toast.error("Magic link failed", { description: msg });
        }

        setLoading(null);
        return;
      }

      toast.success("Check your email", {
        description: "We sent you a sign-in link.",
      });

      // Cooldown prevents accidental resends and avoids 429 during testing
      startCooldown(25);
      setLoading(null);
    } catch (e: any) {
      toast.error("Magic link failed", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const isDev = import.meta.env.DEV;

  const canSendMagic =
    !!email.trim() && !loading && cooldownSeconds === 0;

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-10 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Whozin</h1>
          <p className="text-zinc-400 mt-2">Sign in to see who’s going.</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => startOAuth("google")}
            disabled={!!loading}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-white text-black hover:bg-zinc-200 transition disabled:opacity-60"
          >
            {loading === "google" ? "Signing in with Google…" : "Continue with Google"}
          </button>

          <button
            onClick={() => startOAuth("facebook")}
            disabled={!!loading}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-white/10 border border-white/10 hover:bg-white/15 transition disabled:opacity-60"
          >
            {loading === "facebook" ? "Signing in with Facebook…" : "Continue with Facebook"}
          </button>
        </div>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-xs text-zinc-500">or</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Use a form so Enter triggers the same guarded function */}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startMagicLink();
          }}
        >
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={!canSendMagic}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-60"
          >
            {loading === "magic"
              ? "Sending link…"
              : cooldownSeconds > 0
              ? `Wait ${cooldownSeconds}s…`
              : "Send magic link"}
          </button>

          <button
            type="button"
            onClick={() => navigate(redirect)}
            disabled={!!loading}
            className="w-full px-4 py-3 rounded-2xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-60"
          >
            Cancel
          </button>
        </form>

        {isDev && (
          <div className="mt-8 p-4 rounded-2xl border border-white/10 bg-white/5 text-xs text-zinc-300">
            <div className="font-semibold mb-2">Dev Debug</div>
            <div>
              redirect param: <code className="text-zinc-200">{redirect}</code>
            </div>
            <div>
              callbackUrl: <code className="text-zinc-200">{callbackUrl}</code>
            </div>
            <div>
              supabase project ref:{" "}
              <code className="text-zinc-200">{getSupabaseProjectRef()}</code>
            </div>
            <div>
              supabase url:{" "}
              <code className="text-zinc-200">{import.meta.env.VITE_SUPABASE_URL}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
