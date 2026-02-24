import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { formatRetrySeconds, getRateLimitStatus } from "@/lib/rateLimit";
import AddFriend from "../components/AddFriend";

type FriendRow = {
  friend_id: string;
  status: string | null;
  friend_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type SuggestedProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function Friends() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<FriendRow[]>([]);
  const [suggested, setSuggested] = useState<SuggestedProfile[]>([]);
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [suggestionsHidden, setSuggestionsHidden] = useState(
    localStorage.getItem("whozin_hide_friend_suggestions") === "true"
  );

  const loadFriends = async (): Promise<{
    acceptedIds: Set<string>;
    pendingIds: Set<string>;
  } | null> => {
    setLoading(true);

    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      console.error("getSession error:", sessionErr);
      toast.error("Failed to load session");
      setFriends([]);
      setPending([]);
      setLoading(false);
      return null;
    }

    if (!session?.user?.id) {
      toast.error("Please sign in");
      setFriends([]);
      setPending([]);
      setSuggested([]);
      setLoading(false);
      return null;
    }

    setViewerId(session.user.id);

    const { data, error } = await supabase
      .from("friendships")
      .select(
        "friend_id,status, friend_profile:profiles!friendships_friend_id_fkey(display_name, username, avatar_url)"
      )
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to load friends:", error);
      toast.error(error.message ?? "Failed to load friends");
      setFriends([]);
      setPending([]);
      setLoading(false);
      return null;
    }

    const allRows = (data ?? []) as FriendRow[];
    const accepted = allRows.filter((r) => r.status === "accepted");
    const pendingRows = allRows.filter((r) => r.status !== "accepted");
    setFriends(accepted);
    setPending(pendingRows);

    const acceptedIds = new Set(accepted.map((f) => f.friend_id));
    const pendingIds = new Set(pendingRows.map((f) => f.friend_id));
    const connectedIds = new Set([...acceptedIds, ...pendingIds]);

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .neq("id", session.user.id)
      .not("username", "is", null)
      .limit(40);

    if (pErr) {
      console.error("Failed to load suggested profiles:", pErr);
      toast.error(pErr.message ?? "Failed to load suggested friends");
      setSuggested([]);
    } else {
      const rows = (profiles ?? []) as SuggestedProfile[];
      setSuggested(
        rows.filter((r) => !!r.id && !!r.username && !connectedIds.has(r.id)).slice(0, 20)
      );
    }

    setLoading(false);
    return { acceptedIds, pendingIds };
  };

  const addSuggestedFriend = async (row: SuggestedProfile) => {
    if (!row.id || !row.username) return;
    if (addingIds[row.id] || addedIds[row.id]) return;

    const rl = getRateLimitStatus(`friend_add_suggested:${row.username.toLowerCase()}`, 5000);
    if (!rl.allowed) {
      const seconds = formatRetrySeconds(rl.retryAfterMs);
      toast.error(`Please wait ${seconds}s before trying again.`);
      track("friend_add_rate_limited", { source: "suggested", seconds });
      return;
    }

    setAddingIds((prev) => ({ ...prev, [row.id]: true }));
    setAddedIds((prev) => ({ ...prev, [row.id]: true }));

    const { error } = await supabase.rpc("add_friend_by_username", {
      friend_username: row.username,
    });

    setAddingIds((prev) => ({ ...prev, [row.id]: false }));

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      const isDuplicate = msg.includes("duplicate");
      if (!isDuplicate) {
        setAddedIds((prev) => ({ ...prev, [row.id]: false }));
        toast.error(error.message ?? "Could not add friend");
        track("friend_add_failed", { source: "suggested" });
        return;
      }
    }

    const loaded = await loadFriends();
    setSuggested((prev) => prev.filter((p) => p.id !== row.id));

    if (row.username && loaded?.acceptedIds.has(row.id)) {
      toast.success(`Added @${row.username}`);
      track("friend_added", { source: "suggested", mode: "accepted" });
    } else if (row.username && loaded?.pendingIds.has(row.id)) {
      toast.success(`Request sent to @${row.username}`);
      track("friend_added", { source: "suggested", mode: "pending" });
    } else if (row.username) {
      toast.success(`Connection updated for @${row.username}`);
      track("friend_added", { source: "suggested", mode: "unknown" });
    }
  };

  const hideSuggestions = () => {
    localStorage.setItem("whozin_hide_friend_suggestions", "true");
    setSuggestionsHidden(true);
    track("friend_suggestions_skipped");
  };

  const showSuggestionsAgain = () => {
    localStorage.removeItem("whozin_hide_friend_suggestions");
    setSuggestionsHidden(false);
    track("friend_suggestions_reopened");
  };

  useEffect(() => {
    loadFriends();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Friends</h1>

      {!loading && !suggestionsHidden && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Friends already on Whozin</h2>
          <p className="text-zinc-500 text-sm mb-4">One tap to connect with your crew.</p>

          {suggested.length === 0 ? (
            <div className="text-zinc-500">No more suggestions right now.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {suggested.map((p) => {
                const displayName = p.display_name?.trim() || p.username || "Anon";
                const avatar = p.avatar_url ?? "";
                const adding = !!addingIds[p.id];
                const added = !!addedIds[p.id];

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 bg-zinc-900/50 border border-white/10 rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {avatar ? (
                          <img
                            src={avatar}
                            alt={displayName}
                            className="w-11 h-11 rounded-full object-cover"
                          />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{displayName}</div>
                        {p.username ? <div className="text-xs text-zinc-500 truncate">@{p.username}</div> : null}
                        <div className="text-xs text-zinc-500">Suggested</div>
                      </div>
                    </div>

                    <button
                      onClick={() => addSuggestedFriend(p)}
                      disabled={adding || added || !viewerId}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-pink-600 disabled:opacity-50"
                    >
                      {adding ? "Adding..." : added ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm">
            <button
              onClick={hideSuggestions}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Skip for now
            </button>
            <span className="text-zinc-600">You can add later from this tab.</span>
          </div>
        </div>
      )}

      {!loading && suggestionsHidden && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-zinc-400">Friend suggestions hidden for now.</div>
          <button
            onClick={showSuggestionsAgain}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15"
          >
            Add later
          </button>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Pending requests</h2>
          <div className="grid grid-cols-2 gap-6">
            {pending.map((f) => {
              const displayName =
                f.friend_profile?.display_name?.trim() || f.friend_profile?.username || "Anon";
              const handle = f.friend_profile?.username ? `@${f.friend_profile.username}` : "";
              const avatar = f.friend_profile?.avatar_url ?? "";

              return (
                <div
                  key={f.friend_id}
                  className="flex items-center gap-4 bg-zinc-900/40 border border-white/10 rounded-2xl p-4"
                >
                  {avatar ? (
                      <img
                        src={avatar}
                        alt={displayName}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-zinc-800" />
                  )}

                  <div>
                    <div className="font-semibold">{displayName}</div>
                    {handle ? <div className="text-xs text-zinc-500">{handle}</div> : null}
                    <div className="text-xs text-zinc-500">Requested</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-zinc-400">Loading friends...</div>
      ) : friends.length === 0 && pending.length === 0 ? (
        <div className="text-zinc-500 mb-6">You don't have any friends yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {friends.map((f) => {
            const displayName =
              f.friend_profile?.display_name?.trim() || f.friend_profile?.username || "Anon";
            const handle = f.friend_profile?.username ? `@${f.friend_profile.username}` : "";
            const avatar = f.friend_profile?.avatar_url ?? "";

            return (
              <div
                key={f.friend_id}
                className="flex items-center gap-4 bg-zinc-900/60 border border-white/10 rounded-2xl p-4"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-800" />
                )}

                <div>
                  <div className="font-semibold">{displayName}</div>
                  {handle ? <div className="text-xs text-zinc-500">{handle}</div> : null}
                  <div className="text-xs text-zinc-500">Connected</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddFriend onSuccess={loadFriends} />
    </div>
  );
}
