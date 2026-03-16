import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, getSupabaseProjectRef } from "@/lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { buildSiteUrl } from "@/lib/site";
import { track, trackError } from "@/lib/analytics";
import { toast } from "sonner";
import {
  getPendingMarketingEmailOptIn,
  MARKETING_EMAIL_OPT_IN_LABEL,
  setPendingMarketingEmailOptIn,
  syncPendingMarketingEmailPreference,
} from "@/lib/emailPreferences";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const phoneAuthEnabled = (import.meta.env.VITE_PHONE_AUTH_ENABLED as string | undefined) === "true";

export default function Login() {
  const oauthEnabled = true;
  const query = useQuery();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<null | "google" | "magic" | "phone_send" | "phone_verify">(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(() => getPendingMarketingEmailOptIn(false));

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

  const startOAuth = async (provider: "google") => {
    if (!oauthEnabled) {
      toast.message("Google login is not live yet.");
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
        const lower = msg.toLowerCase();
        const providerDisabled = lower.includes("provider is not enabled");
        track("auth_oauth_failed", {
          provider,
          reason: providerDisabled ? "provider_disabled" : "oauth_error",
          message: msg,
        });
        if (msg.toLowerCase().includes("provider is not enabled")) {
          toast.error("Google login is not set up", {
            description:
              "Either this frontend points at the wrong Supabase project, or the provider is not enabled in Supabase Auth settings.",
          });
        } else {
          toast.error("Could not sign you in", { description: msg });
        }
        setLoading(null);
        return;
      }

      track("oauth_started", { provider, redirect });
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        track("auth_oauth_failed", {
          provider,
          reason: "missing_redirect_url",
        });
        toast.error("Could not sign you in", {
          description: "OAuth redirect is missing. Try again.",
        });
      }
    } catch (e: any) {
      trackError("auth_oauth_exception", e, { provider });
      toast.error("Could not sign you in", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const startMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email");
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
        track("auth_magic_link_failed", {
          reason: isRateLimit ? "rate_limited" : "request_failed",
          message: msg,
        });

        if (isRateLimit) {
          startCooldown(25);
          toast.error("Too many tries. Wait a sec, then try again.");
        } else {
          toast.error("Could not send the link", { description: msg });
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
      trackError("auth_magic_link_exception", e);
      toast.error("Could not send the link", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const sendPhoneCode = async () => {
    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed) {
      toast.error("Enter your number");
      return;
    }
    if (loading) return;

    try {
      setLoading("phone_send");
      localStorage.setItem("whozin_post_auth_redirect", redirect);

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneTrimmed,
        options: { channel: "sms" },
      });

      if (error) {
        toast.error("Could not send the code", { description: error.message });
        setLoading(null);
        return;
      }

      setPhoneCodeSent(true);
      toast.success("Code sent", { description: "Drop in the 6-digit text code." });
      setLoading(null);
    } catch (e: any) {
      toast.error("Could not send the code", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const verifyPhoneCode = async () => {
    const phoneTrimmed = phone.trim();
    const codeTrimmed = phoneCode.trim();
    if (!phoneTrimmed || !codeTrimmed) {
      toast.error("Enter your number and code");
      return;
    }
    if (loading) return;

    try {
      setLoading("phone_verify");
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneTrimmed,
        token: codeTrimmed,
        type: "sms",
      });

      if (error) {
        toast.error("That code did not work", { description: error.message });
        setLoading(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await syncPendingMarketingEmailPreference({
          userId: user.id,
          email: user.email ?? null,
          source: "login_phone",
        });
      }

      track("phone_login_success", { redirect });
      toast.success("You're in.");
      navigate(redirect, { replace: true });
    } catch (e: any) {
      toast.error("That code did not work", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const isDev = import.meta.env.DEV;
  const canSendMagic = !!email.trim() && !loading && cooldownSeconds === 0;
  const canSendPhoneCode = !!phone.trim() && !loading;
  const canVerifyPhoneCode = !!phone.trim() && !!phoneCode.trim() && !loading;

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-10 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Get Back In</h1>
          <p className="text-zinc-400 mt-2">
            {phoneAuthEnabled ? "Use Google, text, or a magic link." : "Use Google or a magic link."}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-4 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => {
                const checked = e.target.checked;
                setMarketingOptIn(checked);
                setPendingMarketingEmailOptIn(checked);
              }}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 text-pink-500 focus:ring-pink-500"
            />
            <span>
              {MARKETING_EMAIL_OPT_IN_LABEL}
              <span className="mt-1 block text-xs text-zinc-500">
                Account, security, and service emails can still go out when needed.
              </span>
            </span>
          </label>

          <button
            onClick={() => startOAuth("google")}
            disabled={!!loading}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-white text-black border border-white/20 transition disabled:opacity-80 disabled:cursor-not-allowed"
          >
            {loading === "google" ? "Opening Google..." : "Use Google"}
          </button>
        </div>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-xs text-zinc-500">or</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {phoneAuthEnabled ? (
          <form
            className="space-y-3 mb-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (phoneCodeSent) void verifyPhoneCode();
              else void sendPhoneCode();
            }}
          >
            <div>
              <label className="text-sm text-zinc-400">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+13125551234"
                className="mt-2 w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            {phoneCodeSent ? (
              <div>
                <label className="text-sm text-zinc-400">SMS code</label>
                <input
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="123456"
                  className="mt-2 w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={phoneCodeSent ? !canVerifyPhoneCode : !canSendPhoneCode}
              className="w-full px-4 py-4 rounded-2xl font-semibold bg-zinc-800 border border-white/10 disabled:opacity-60"
            >
              {loading === "phone_send"
                ? "Sending code..."
                : loading === "phone_verify"
                ? "Verifying..."
                : phoneCodeSent
                ? "Verify code"
                : "Use phone"}
            </button>

            {phoneCodeSent ? (
              <button
                type="button"
                disabled={!!loading}
                onClick={() => {
                  setPhoneCodeSent(false);
                  setPhoneCode("");
                }}
                className="w-full px-4 py-3 rounded-2xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-60"
              >
                Use a different number
              </button>
            ) : null}
          </form>
        ) : null}

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
            Not now
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
              supabase project ref: <code className="text-zinc-200">{getSupabaseProjectRef()}</code>
            </div>
            <div>
              phone auth enabled: <code className="text-zinc-200">{String(phoneAuthEnabled)}</code>
            </div>
            <div>
              supabase url: <code className="text-zinc-200">{import.meta.env.VITE_SUPABASE_URL}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
