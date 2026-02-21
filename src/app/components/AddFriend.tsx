import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

type Props = {
  onSuccess?: () => void;
};

function friendlyError(message?: string) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("no user found")) return "No account found with that username.";
  if (m.includes("cannot add yourself")) return "You can't add yourself.";
  if (m.includes("not authenticated")) return "Please sign in first.";
  if (m.includes("username is required")) return "Enter a username.";
  return message ?? "Failed to add friend";
}

export default function AddFriend({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [working, setWorking] = useState(false);

  const handleAdd = async () => {
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
      toast.success("Connection request sent");
      track("friend_add_submitted", { source: "manual" });
      setUsername("");
      onSuccess?.();
    }

    setWorking(false);
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">Add Friend</h2>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="username (ex: james_123abc)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
        />

        <button
          onClick={handleAdd}
          disabled={working}
          className="px-6 py-3 rounded-xl font-semibold bg-pink-600 disabled:opacity-50"
        >
          {working ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="text-xs text-zinc-500 mt-2">Tip: your username is on your Profile page.</div>
    </div>
  );
}
