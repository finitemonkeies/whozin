import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AddByInvite() {
  const { handle } = useParams(); // @username
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);

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

    // If not logged in → redirect to login and preserve return path
    if (!session) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    // Logged in → attempt to add friend
    const { error } = await supabase.rpc("add_friend_by_username", {
      friend_username: username,
    });

    if (error) {
      console.error("Invite add error:", error);

      // If already friends, still treat as success
      if (error.message?.toLowerCase().includes("duplicate")) {
        toast.success("You're already connected");
      } else if (
        error.message?.toLowerCase().includes("cannot add yourself")
      ) {
        toast.error("That’s you 🙂");
      } else {
        toast.error(error.message ?? "Could not add friend");
      }
    } else {
      toast.success("Connection request sent");
    }

    navigate("/friends");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-zinc-400">Processing invite…</div>
    </div>
  );
}

