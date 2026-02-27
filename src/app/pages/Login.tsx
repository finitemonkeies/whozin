import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, getSupabaseProjectRef } from "@/lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { buildSiteUrl } from "@/lib/site";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Login() {
  const oauthEnabled = false;
  const query = useQuery();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<null | "google" | "facebook" | "magic">(null);
  const [email, setEmail] = useState("");

  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const redirect = sanitizeRedirectTarget(query.get("redirect"));
  const callbackUrl = buildSiteUrl("/auth/callback");

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
    if (!oauthEnabled) {
      toast.message(`${provider === "google" ? "Google" : "Facebook"} login is coming soon.`);
      return;
    }

    try {
      setLoading(provider);
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
              "Either this frontend points at the wrong Supabase project, or the provider is not enabled in Supabase Auth settings.",
          });
        } else {
          toast.error("Login failed", { description: msg });
        }
        setLoading(null);
        return;
      }

      track("oauth_started", { provider, redirect });
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
        const isRateLimit =
          msg.includes("429") ||
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("too many") ||
          msg.toLowerCase().includes("over_email_send_rate_limit");

        if (isRateLimit) {
          startCooldown(25);
          toast.error("Too many tries. Please wait a moment and try again.");
        } else {
          toast.error("Magic link failed", { description: msg });
        }

        setLoading(null);
        return;
      }

      toast.success("Check your inbox", {
        description: "Your sign-in link is on the way.",
      });
      track("magic_link_requested", { redirect });

      startCooldown(25);
      setLoading(null);
    } catch (e: any) {
      toast.error("Magic link failed", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const isDev = import.meta.env.DEV;
  const canSendMagic = !!email.trim() && !loading && cooldownSeconds === 0;

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-10 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Sign in to continue</h1>
          <p className="text-zinc-400 mt-2">We'll send a secure magic link to your email.</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => startOAuth("google")}
            disabled={!oauthEnabled || !!loading}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-zinc-800 text-zinc-400 border border-white/10 transition disabled:opacity-80 disabled:cursor-not-allowed"
          >
            {loading === "google"
              ? "Signing in with Google..."
              : "Continue with Google (Coming soon)"}
          </button>

          <button
            onClick={() => startOAuth("facebook")}
            disabled={!oauthEnabled || !!loading}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-zinc-800 text-zinc-400 border border-white/10 transition disabled:opacity-80 disabled:cursor-not-allowed"
          >
            {loading === "facebook"
              ? "Signing in with Facebook..."
              : "Continue with Facebook (Coming soon)"}
          </button>
        </div>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-xs text-zinc-500">or</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startMagicLink();
          }}
        >
          <div>
            <label className="text-sm text-zinc-400">Email address</label>
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
              ? "Sending link..."
              : cooldownSeconds > 0
              ? `Wait ${cooldownSeconds}s...`
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
