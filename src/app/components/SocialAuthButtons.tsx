import { supabase } from "@/lib/supabase";
import { getSiteOrigin } from "@/lib/site";
import { toast } from "sonner";

type Props = {
  redirectTo?: string;
};

export default function SocialAuthButtons({ redirectTo }: Props) {
  const oauthEnabled = false;

  const signIn = async (provider: "facebook" | "google") => {
    if (!oauthEnabled) {
      toast.message(`${provider === "google" ? "Google" : "Facebook"} login is coming soon.`);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || getSiteOrigin(),
      },
    });

    if (error) {
      console.error(error);
      toast.error(error.message ?? "Failed to start sign-in");
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => signIn("facebook")}
        disabled={!oauthEnabled}
        className="w-full px-6 py-3 rounded-xl font-semibold bg-zinc-800 text-zinc-400 border border-white/10 disabled:cursor-not-allowed"
      >
        Continue with Facebook (Coming soon)
      </button>

      <button
        onClick={() => signIn("google")}
        disabled={!oauthEnabled}
        className="w-full px-6 py-3 rounded-xl font-semibold bg-zinc-800 text-zinc-400 border border-white/10 disabled:cursor-not-allowed"
      >
        Continue with Google (Coming soon)
      </button>

      <div className="text-xs text-zinc-500 text-center">
        Tip: Facebook helps you find friends faster. Google is the easiest fallback.
      </div>
    </div>
  );
}
