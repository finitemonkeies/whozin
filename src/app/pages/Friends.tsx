import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import AddFriend from "../components/AddFriend";

type FriendRow = {
  friend_id: string;
  status: string | null;
  friend_profile?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type SuggestedProfile = {
  id: string;
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

    /**
     * IMPORTANT:
     * We must disambiguate which relationship to embed because friendships links to profiles twice.
     * This uses the FK from friendships.friend_id -> profiles.id.
     *
     * If your FK constraint name is different, change:
     * profiles!friendships_friend_id_fkey
     * to the exact name shown in Supabase Table Editor for friendships -> foreign keys.
     */
    const { data, error } = await supabase
      .from("friendships")
      .select(
        "friend_id,status, friend_profile:profiles!friendships_friend_id_fkey(username, avatar_url)"
      )
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to load friends:", error);
      toast.error(error.message ?? "Failed to load friends");
      setFriends([]);
      setPending([]);
    } else {
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
        .select("id,username,avatar_url")
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
    }

    setLoading(false);
    return null;
  };

  const addSuggestedFriend = async (row: SuggestedProfile) => {
    if (!row.id || !row.username) return;
    if (addingIds[row.id] || addedIds[row.id]) return;

    setAddingIds((prev) => ({ ...prev, [row.id]: true }));
    setAddedIds((prev) => ({ ...prev, [row.id]: true })); // optimistic

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
        return;
      }
    }

    const loaded = await loadFriends();
    setSuggested((prev) => prev.filter((p) => p.id !== row.id));

    if (row.username && loaded?.acceptedIds.has(row.id)) {
      toast.success(`Added @${row.username}`);
    } else if (row.username && loaded?.pendingIds.has(row.id)) {
      toast.success(`Request sent to @${row.username}`);
    } else if (row.username) {
      toast.success(`Connection updated for @${row.username}`);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Friends</h1>

      {!loading && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Friends already on Whozin</h2>
          <p className="text-zinc-500 text-sm mb-4">One tap to connect with your crew.</p>

          {suggested.length === 0 ? (
            <div className="text-zinc-500">No more suggestions right now.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {suggested.map((p) => {
                const name = p.username ?? "anon";
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
                          alt={name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">@{name}</div>
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
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Pending requests</h2>
          <div className="grid grid-cols-2 gap-6">
            {pending.map((f) => {
              const name = f.friend_profile?.username ?? "Anon";
              const avatar = f.friend_profile?.avatar_url ?? "";

              return (
                <div
                  key={f.friend_id}
                  className="flex items-center gap-4 bg-zinc-900/40 border border-white/10 rounded-2xl p-4"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-zinc-800" />
                  )}

                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-xs text-zinc-500">Requested</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-zinc-400">Loading friends…</div>
      ) : friends.length === 0 && pending.length === 0 ? (
        <div className="text-zinc-500 mb-6">You don’t have any friends yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {friends.map((f) => {
            const name = f.friend_profile?.username ?? "Anon";
            const avatar = f.friend_profile?.avatar_url ?? "";

            return (
              <div
                key={f.friend_id}
                className="flex items-center gap-4 bg-zinc-900/60 border border-white/10 rounded-2xl p-4"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-800" />
                )}

                <div>
                  <div className="font-semibold">{name}</div>
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
