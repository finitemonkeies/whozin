import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import AddFriend from "../components/AddFriend";
import { featureFlags } from "@/lib/featureFlags";

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
  mutualCount?: number;
};

export default function Friends() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const onboardingMode = useMemo(
    () => new URLSearchParams(location.search).get("onboarding") === "1",
    [location.search]
  );
  const [friendUnlockMessage, setFriendUnlockMessage] = useState<string | null>(null);

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
      toast.error("Could not load your session");
      setFriends([]);
      setPending([]);
      setLoading(false);
      return null;
    }

    if (!session?.user?.id) {
      toast.error("Sign in first");
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
      toast.error(error.message ?? "Could not load your people");
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

    const acceptedList = [...acceptedIds];
    let mutualCounts = new Map<string, number>();

    if (acceptedList.length > 0) {
      const { data: networkRows, error: networkErr } = await supabase
        .from("friendships")
        .select("user_id,friend_id,status")
        .in("user_id", acceptedList)
        .eq("status", "accepted");

      if (networkErr) {
        console.error("Failed to load mutual network:", networkErr);
      } else {
        mutualCounts = (networkRows ?? []).reduce((acc, row) => {
          const candidateId = row.friend_id as string | null;
          if (
            !candidateId ||
            candidateId === session.user.id ||
            connectedIds.has(candidateId)
          ) {
            return acc;
          }
          acc.set(candidateId, (acc.get(candidateId) ?? 0) + 1);
          return acc;
        }, new Map<string, number>());
      }
    }

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .neq("id", session.user.id)
      .not("username", "is", null)
      .limit(80);

    if (pErr) {
      console.error("Failed to load suggested profiles:", pErr);
      toast.error(pErr.message ?? "Could not load suggestions");
      setSuggested([]);
    } else {
      const rows = (profiles ?? []) as SuggestedProfile[];
      const prioritized = rows
        .filter((r) => !!r.id && !!r.username && !connectedIds.has(r.id))
        .map((r) => ({
          ...r,
          mutualCount: mutualCounts.get(r.id) ?? 0,
        }))
        .sort((a, b) => {
          if ((b.mutualCount ?? 0) !== (a.mutualCount ?? 0)) {
            return (b.mutualCount ?? 0) - (a.mutualCount ?? 0);
          }
          const aName = (a.display_name || a.username || "").toLowerCase();
          const bName = (b.display_name || b.username || "").toLowerCase();
          return aName.localeCompare(bName);
        })
        .slice(0, 20);
      setSuggested(prioritized);
    }

    setLoading(false);
    return { acceptedIds, pendingIds };
  };

  const addSuggestedFriend = async (row: SuggestedProfile) => {
    if (featureFlags.killSwitchFriendAdds) {
      toast.error("Friend adds are down right now");
      return;
    }
    if (!row.id || !row.username) return;
    if (addingIds[row.id] || addedIds[row.id]) return;

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
          toast.error(error.message ?? "Could not add them");
        track("friend_add_failed", { source: "suggested" });
        return;
      }
    }

    const loaded = await loadFriends();
    setSuggested((prev) => prev.filter((p) => p.id !== row.id));

    if (row.username && loaded?.acceptedIds.has(row.id)) {
      const unlockCopy = "Nice. Your feed just got sharper.";
      setFriendUnlockMessage(unlockCopy);
      toast.success(`${unlockCopy} @${row.username} is now in your circle.`);
      track("friend_added", { source: "suggested", mode: "accepted" });
      track("friend_add", { source: "suggested", mode: "accepted" });
    } else if (row.username && loaded?.pendingIds.has(row.id)) {
      const unlockCopy = "Nice. You started the loop.";
      setFriendUnlockMessage(unlockCopy);
      toast.success(`${unlockCopy} Request sent to @${row.username}.`);
      track("friend_added", { source: "suggested", mode: "pending" });
      track("friend_add", { source: "suggested", mode: "pending" });
    } else if (row.username) {
      const unlockCopy = "Connection updated. Your signal just got better.";
      setFriendUnlockMessage(unlockCopy);
      toast.success(`${unlockCopy} @${row.username} is in motion.`);
      track("friend_added", { source: "suggested", mode: "unknown" });
      track("friend_add", { source: "suggested", mode: "unknown" });
    }

    if (onboardingMode) {
      navigate("/explore?onboarding=1", { replace: true });
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
    <div className="min-h-screen bg-black text-white px-5 py-8 pb-[calc(13rem+env(safe-area-inset-bottom))] sm:px-6">
      <h1 className="text-3xl font-bold mb-6">Your People</h1>

      {onboardingMode ? (
        <div className="mb-6 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">Step 1: pull your people in</div>
          <div className="mt-1 text-xs text-zinc-300">
            Add one friend, then we'll send you straight to tonight's best picks.
          </div>
        </div>
      ) : null}

      {friendUnlockMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">{friendUnlockMessage}</div>
          <div className="mt-1 text-xs text-zinc-300">
            More of your people means sharper picks, stronger social proof, and faster calls.
          </div>
        </div>
      ) : null}

      {!loading ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-100">Bring your people in early</div>
          <div className="mt-1 text-xs text-zinc-400">
            More friends means stronger picks and more nights that actually turn into plans.
          </div>
        </div>
      ) : null}

      {!loading && !suggestionsHidden && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Already Here</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Start with one person you actually go out with. The app gets better immediately.
          </p>

          {suggested.length === 0 ? (
            <div className="text-zinc-500">
              No more suggestions right now. Add one manually and keep it moving.
            </div>
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
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {avatar ? (
                          <img
                            src={avatar}
                            alt={displayName}
                            className="w-11 h-11 rounded-full object-cover"
                          />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-zinc-800" />
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-semibold truncate">{displayName}</div>
                        {p.username ? <div className="text-xs text-zinc-500 truncate">@{p.username}</div> : null}
                        <div className="text-xs text-zinc-500">
                          {(p.mutualCount ?? 0) > 0
                            ? `${p.mutualCount} mutual ${(p.mutualCount ?? 0) === 1 ? "friend" : "friends"}`
                            : "Worth adding"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addSuggestedFriend(p)}
                      disabled={adding || added || !viewerId || featureFlags.killSwitchFriendAdds}
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
              Not now
            </button>
            <span className="text-zinc-600">You can come back anytime.</span>
          </div>
        </div>
      )}

      {!loading && suggestionsHidden && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-zinc-400">Suggestions hidden for now.</div>
          <button
            onClick={showSuggestionsAgain}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15"
          >
            Show again
          </button>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Pending</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {pending.map((f) => {
              const displayName =
                f.friend_profile?.display_name?.trim() || f.friend_profile?.username || "Anon";
              const handle = f.friend_profile?.username ? `@${f.friend_profile.username}` : "";
              const avatar = f.friend_profile?.avatar_url ?? "";

              return (
                <div
                  key={f.friend_id}
                  className="flex min-w-0 items-center gap-4 bg-zinc-900/40 border border-white/10 rounded-2xl p-4"
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

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="font-semibold truncate">{displayName}</div>
                    {handle ? <div className="text-xs text-zinc-500 truncate">{handle}</div> : null}
                    <div className="text-xs text-zinc-500">Request sent</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-zinc-400">Loading your people...</div>
      ) : friends.length === 0 && pending.length === 0 ? (
        <div className="text-zinc-500 mb-6">
          Nobody here yet. Add one real friend and this starts making sense fast.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 sm:gap-6">
          {friends.map((f) => {
            const displayName =
              f.friend_profile?.display_name?.trim() || f.friend_profile?.username || "Anon";
            const handle = f.friend_profile?.username ? `@${f.friend_profile.username}` : "";
            const avatar = f.friend_profile?.avatar_url ?? "";

            return (
              <div
                key={f.friend_id}
                className="flex min-w-0 items-center gap-4 bg-zinc-900/60 border border-white/10 rounded-2xl p-4"
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

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="font-semibold truncate">{displayName}</div>
                  {handle ? <div className="text-xs text-zinc-500 truncate">{handle}</div> : null}
                  <div className="text-xs text-zinc-500">In your circle</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddFriend
        onSuccess={async () => {
          await loadFriends();
          setFriendUnlockMessage("Nice. Your feed just got sharper.");
          toast.success("Nice. Your feed just got sharper.");
          if (onboardingMode) {
            navigate("/explore?onboarding=1", { replace: true });
          }
        }}
      />
    </div>
  );
}
