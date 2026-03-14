import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { featureFlags } from "@/lib/featureFlags";

type Props = {
  onSuccess?: () => void | Promise<void>;
  sticky?: boolean;
};

function friendlyError(message?: string) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("no user found")) return "No one here with that @ yet.";
  if (m.includes("cannot add yourself")) return "You already have you.";
  if (m.includes("not authenticated")) return "Sign in first.";
  if (m.includes("username is required")) return "Drop an @ first.";
  return message ?? "Could not add friend";
}

export default function AddFriend({ onSuccess, sticky = true }: Props) {
  const [username, setUsername] = useState("");
  const [working, setWorking] = useState(false);

  const handleAdd = async () => {
    if (featureFlags.killSwitchFriendAdds) {
      toast.error("Friend adds are down right now");
      return;
    }
    const trimmed = username.trim();
    if (!trimmed) return;

    setWorking(true);

    const { error } = await supabase.rpc("add_friend_by_username", {
      friend_username: trimmed,
    });

    if (error) {
      console.error("add_friend_by_username error:", error);
      toast.error(friendlyError(error.message));
      track("friend_add_failed", { source: "manual" });
    } else {
      toast.success("Request sent.");
      track("friend_add_submitted", { source: "manual" });
      track("friend_add", { source: "manual", mode: "submitted" });
      setUsername("");
      await onSuccess?.();
    }

    setWorking(false);
  };

  return (
    <div className={`${sticky ? "sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20" : ""} mt-8`}>
      <div className="rounded-[28px] border border-white/10 bg-black/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <h2 className="text-xl font-bold mb-3">Bring Your People In</h2>
        <div className="mb-3 text-xs text-zinc-500">
          Add one real friend and the app starts reading your actual night, not just the city.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="@username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="min-w-0 flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
          />

          <button
            onClick={handleAdd}
            disabled={working || featureFlags.killSwitchFriendAdds}
            className="px-6 py-3 rounded-xl font-semibold bg-pink-600 disabled:opacity-50"
          >
            {working ? "Adding..." : "Add friend"}
          </button>
        </div>

        <div className="text-xs text-zinc-500 mt-2">Tip: your @ is on your profile.</div>
      </div>
    </div>
  );
}
