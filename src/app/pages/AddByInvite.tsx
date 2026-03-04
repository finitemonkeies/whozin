import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import {
  claimPendingReferral,
  registerReferralOpen,
  storePendingReferral,
} from "@/lib/referrals";

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

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
    const params = new URLSearchParams(location.search);
    const refToken = (params.get("ref") ?? "").trim();
    const source = (params.get("src") ?? "share_link").trim() || "share_link";
    const eventId = params.get("event");

    if (!username) {
      toast.error("Invalid invite link");
      navigate("/");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (refToken) {
      try {
        await registerReferralOpen({
          token: refToken,
          eventId: isUuid(eventId) ? eventId : null,
          source,
        });
      } catch (err) {
        console.error("Failed to register referral open:", err);
      }
    }

    if (!session) {
      if (refToken) {
        storePendingReferral({
          token: refToken,
          eventId: isUuid(eventId) ? eventId : null,
          source,
          openedWhileLoggedOut: true,
        });
      }
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    try {
      if (refToken) {
        await claimPendingReferral(source);
      }
    } catch (err) {
      console.error("Failed claiming referral:", err);
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

    if (isUuid(eventId)) {
      navigate(`/event/${eventId}?src=share_link`);
      return;
    }

    navigate("/friends");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-zinc-400">Processing invite...</div>
    </div>
  );
}
