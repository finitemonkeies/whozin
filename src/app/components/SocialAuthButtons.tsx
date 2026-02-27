import { supabase } from "@/lib/supabase";
import { getSiteOrigin } from "@/lib/site";
import { toast } from "sonner";

type Props = {
  redirectTo?: string;
};

export default function SocialAuthButtons({ redirectTo }: Props) {
  const signIn = async (provider: "facebook" | "google") => {
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
        className="w-full px-6 py-3 rounded-xl font-semibold bg-white/10 border border-white/10 hover:bg-white/15"
      >
        Continue with Facebook
      </button>

      <button
        onClick={() => signIn("google")}
        className="w-full px-6 py-3 rounded-xl font-semibold bg-white/10 border border-white/10 hover:bg-white/15"
      >
        Continue with Google
      </button>

      <div className="text-xs text-zinc-500 text-center">
        Tip: Facebook helps you find friends faster. Google is the easiest fallback.
      </div>
    </div>
  );
}
