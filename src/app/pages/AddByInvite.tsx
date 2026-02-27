import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

export default function AddByInvite() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    run();
  }, []);

  const run = async () => {
    const raw = handle ?? "";
    const username = raw.startsWith("@") ? raw.slice(1) : raw;

    if (!username) {
      toast.error("Invalid invite link");
      navigate("/");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    const { error } = await supabase.rpc("add_friend_by_username", {
      friend_username: username,
    });

    if (error) {
      console.error("Invite add error:", error);

      if (error.message?.toLowerCase().includes("duplicate")) {
        toast.success("You're already connected");
      } else if (error.message?.toLowerCase().includes("cannot add yourself")) {
        toast.error("That's you.");
      } else {
        toast.error(error.message ?? "Could not add friend");
      }
      track("friend_add_failed", { source: "invite" });
    } else {
      toast.success("Connection request sent");
      track("friend_add_submitted", { source: "invite" });
    }

    navigate("/friends");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-zinc-400">Processing invite...</div>
    </div>
  );
}
