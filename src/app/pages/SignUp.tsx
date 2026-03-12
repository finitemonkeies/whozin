import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sanitizeRedirectTarget } from "@/lib/redirect";
import { track } from "@/lib/analytics";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const phoneAuthEnabled = (import.meta.env.VITE_PHONE_AUTH_ENABLED as string | undefined) === "true";

export function SignUp() {
  const navigate = useNavigate();
  const query = useQuery();
  const redirect = sanitizeRedirectTarget(query.get("redirect"));

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState<null | "send" | "verify">(null);

  const sendCode = async () => {
    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed) {
      toast.error("Enter your number");
      return;
    }
    if (loading) return;

    try {
      setLoading("send");
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

      setCodeSent(true);
      toast.success("Code sent.");
      setLoading(null);
    } catch (e: any) {
      toast.error("Could not send the code", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  const verifyCode = async () => {
    const phoneTrimmed = phone.trim();
    const codeTrimmed = code.trim();
    if (!phoneTrimmed || !codeTrimmed) {
      toast.error("Enter your number and code");
      return;
    }
    if (loading) return;

    try {
      setLoading("verify");
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

      track("phone_signup_success", { redirect });
      toast.success("You're in.");
      navigate(redirect, { replace: true });
    } catch (e: any) {
      toast.error("That code did not work", { description: e?.message || "Unknown error" });
      setLoading(null);
    }
  };

  if (!phoneAuthEnabled) {
    return (
      <div className="min-h-screen bg-black text-white px-5 pt-10 pb-24">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Sign up</h1>
            <p className="text-zinc-400 mt-2">
              Phone signup is paused for now. Use Google or a magic link.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-10 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Create your account</h1>
          <p className="text-zinc-400 mt-2">Get in with your number in under 10 seconds.</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (codeSent) void verifyCode();
            else void sendCode();
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

          {codeSent ? (
            <div>
              <label className="text-sm text-zinc-400">SMS code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="mt-2 w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!!loading}
            className="w-full px-4 py-4 rounded-2xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-60"
          >
            {loading === "send"
              ? "Sending code..."
              : loading === "verify"
              ? "Verifying..."
              : codeSent
              ? "Verify code"
              : "Use phone"}
          </button>

          {codeSent ? (
            <button
              type="button"
              disabled={!!loading}
              onClick={() => {
                setCodeSent(false);
                setCode("");
              }}
              className="w-full px-4 py-3 rounded-2xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-60"
            >
              Use a different number
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
