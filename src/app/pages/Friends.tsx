import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import AddFriend from "../components/AddFriend";
import { featureFlags } from "@/lib/featureFlags";
import { shareInviteLink } from "@/lib/inviteSharing";
import { blockUser, getBlockedUserIds, reportUser } from "@/lib/privacySafety";
import { useAuth } from "@/app/providers/AuthProvider";
import { ShareIcon } from "@/app/components/WhozinIcons";

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
  mutualPreview?: string[];
  sharedEventCount?: number;
  recentSharedEventCount?: number;
  sharedEventTitle?: string | null;
  reason?: string;
};

function profileLabel(profile?: {
  display_name: string | null;
  username: string | null;
} | null) {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;
  const username = profile?.username?.trim();
  if (username) return `@${username}`;
  return "A friend";
}

function mutualPreviewText(names: string[], count: number) {
  if (count <= 0 || names.length === 0) return "Worth adding";
  if (count === 1) return `Mutual with ${names[0]}`;
  if (count === 2) return `Mutual with ${names[0]} and ${names[1]}`;
  return `Mutual with ${names[0]}, ${names[1]} +${count - 2}`;
}

function suggestionReason(profile: SuggestedProfile) {
  if ((profile.sharedEventCount ?? 0) > 0 && profile.sharedEventTitle) {
    return profile.recentSharedEventCount
      ? `Seen around ${profile.sharedEventTitle} and other moves`
      : `Seen around ${profile.sharedEventTitle}`;
  }
  if ((profile.sharedEventCount ?? 0) > 1) {
    return `In the same mix on ${profile.sharedEventCount} moves`;
  }
  if ((profile.mutualCount ?? 0) > 0) {
    return mutualPreviewText(profile.mutualPreview ?? [], profile.mutualCount ?? 0);
  }
  return "Worth adding";
}

function profileHandle(username?: string | null) {
  const value = username?.trim();
  return value ? `@${value}` : "";
}

function PersonCard({
  displayName,
  handle,
  avatar,
  eyebrow,
  body,
  action,
  footer,
}: {
  displayName: string;
  handle?: string;
  avatar?: string;
  eyebrow?: string;
  body: string;
  action?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/55 px-4 py-4">
      <div className="flex items-start gap-3">
        {avatar ? (
          <img src={avatar} alt={displayName} className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-zinc-800" />
        )}

        <div className="min-w-0 flex-1">
          {eyebrow ? <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</div> : null}
          <div className="truncate text-base font-semibold text-white">{displayName}</div>
          {handle ? <div className="mt-0.5 truncate text-xs text-zinc-500">{handle}</div> : null}
          <div className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">{body}</div>
        </div>

        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

export default function Friends() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading, user } = useAuth();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<FriendRow[]>([]);
  const [suggested, setSuggested] = useState<SuggestedProfile[]>([]);
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsHidden, setSuggestionsHidden] = useState(
    localStorage.getItem("whozin_hide_friend_suggestions") === "true"
  );
  const onboardingMode = useMemo(
    () => new URLSearchParams(location.search).get("onboarding") === "1",
    [location.search]
  );
  const [friendUnlockMessage, setFriendUnlockMessage] = useState<string | null>(null);
  const [sharingInvite, setSharingInvite] = useState(false);
  const [safetyWorkingId, setSafetyWorkingId] = useState<string | null>(null);

  const loadFriends = async (): Promise<{
    acceptedIds: Set<string>;
    pendingIds: Set<string>;
  } | null> => {
    setLoading(true);

    if (!user?.id) {
      toast.error("Sign in first");
      setFriends([]);
      setPending([]);
      setSuggested([]);
      setLoading(false);
      return null;
    }

    setViewerId(user.id);

    const blockedIds = await getBlockedUserIds().catch((error) => {
      console.error("Failed to load blocked users:", error);
      return new Set<string>();
    });

    const { data, error } = await supabase
      .from("friendships")
      .select(
        "friend_id,status, friend_profile:profiles!friendships_friend_id_fkey(display_name, username, avatar_url)"
      )
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to load friends:", error);
      toast.error(error.message ?? "Could not load your friends");
      setFriends([]);
      setPending([]);
      setLoading(false);
      return null;
    }

    const allRows = ((data ?? []) as FriendRow[]).filter((row) => !blockedIds.has(row.friend_id));
    const accepted = allRows.filter((r) => r.status === "accepted");
    const pendingRows = allRows.filter((r) => r.status !== "accepted");
    setFriends(accepted);
    setPending(pendingRows);

    const acceptedIds = new Set(accepted.map((f) => f.friend_id));
    const pendingIds = new Set(pendingRows.map((f) => f.friend_id));
    const connectedIds = new Set([...acceptedIds, ...pendingIds]);
    const acceptedNameById = new Map(
      accepted.map((f) => [f.friend_id, profileLabel(f.friend_profile ?? null)])
    );
    setLoading(false);

    const loadSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const acceptedList = [...acceptedIds];
        let mutualCounts = new Map<string, number>();
        let mutualPreviewByCandidate = new Map<string, string[]>();
        let sharedEventCounts = new Map<string, number>();
        let recentSharedEventCounts = new Map<string, number>();
        let sharedEventTitleByCandidate = new Map<string, string>();

        if (acceptedList.length > 0) {
          const { data: networkRows, error: networkErr } = await supabase
            .from("friendships")
            .select("user_id,friend_id,status")
            .in("user_id", acceptedList)
            .eq("status", "accepted");

          if (networkErr) {
            console.error("Failed to load mutual network:", networkErr);
          } else {
            for (const row of (networkRows ?? []) as Array<{ user_id: string | null; friend_id: string | null }>) {
              const candidateId = row.friend_id as string | null;
              if (
                !candidateId ||
                candidateId === user.id ||
                connectedIds.has(candidateId) ||
                blockedIds.has(candidateId)
              ) {
                continue;
              }

              mutualCounts.set(candidateId, (mutualCounts.get(candidateId) ?? 0) + 1);

              const mutualName = acceptedNameById.get(row.user_id ?? "");
              if (!mutualName) continue;
              const current = mutualPreviewByCandidate.get(candidateId) ?? [];
              if (!current.includes(mutualName)) {
                current.push(mutualName);
                mutualPreviewByCandidate.set(candidateId, current);
              }
            }
          }
        }

        const socialSeedUserIds = Array.from(new Set([user.id, ...acceptedList]));

        if (socialSeedUserIds.length > 0) {
          const recentWindowIso = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
          const { data: seedAttendance, error: seedAttendanceErr } = await supabase
            .from("attendees")
            .select("event_id,user_id,created_at")
            .in("user_id", socialSeedUserIds)
            .gte("created_at", recentWindowIso);

          if (seedAttendanceErr) {
            console.error("Failed to load shared-event suggestions:", seedAttendanceErr);
          } else {
            const eventIds = Array.from(
              new Set(
                (seedAttendance ?? [])
                  .map((row) => String(row.event_id ?? ""))
                  .filter(Boolean)
              )
            );

            if (eventIds.length > 0) {
              const [{ data: allAttendance, error: allAttendanceErr }, { data: eventRows, error: eventRowsErr }] =
                await Promise.all([
                  supabase.from("attendees").select("event_id,user_id,created_at").in("event_id", eventIds),
                  supabase.from("events").select("id,title").in("id", eventIds),
                ]);

              if (allAttendanceErr) {
                console.error("Failed to load candidate attendance:", allAttendanceErr);
              } else {
                const eventTitleById = new Map(
                  ((eventRows ?? []) as Array<{ id: string; title: string | null }>).map((row) => [
                    row.id,
                    (row.title ?? "").trim(),
                  ])
                );
                const recentThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;

                const viewerEventIds = new Set(
                  ((seedAttendance ?? []) as Array<{ event_id: string; user_id: string; created_at?: string | null }>)
                    .filter((row) => row.user_id === user.id)
                    .map((row) => row.event_id)
                );

                for (const row of (allAttendance ?? []) as Array<{
                  event_id: string;
                  user_id: string;
                  created_at?: string | null;
                }>) {
                  const candidateId = row.user_id;
                  if (
                    !candidateId ||
                    candidateId === user.id ||
                    connectedIds.has(candidateId) ||
                    blockedIds.has(candidateId)
                  ) {
                    continue;
                  }

                  if (!viewerEventIds.has(row.event_id)) continue;

                  sharedEventCounts.set(candidateId, (sharedEventCounts.get(candidateId) ?? 0) + 1);

                  const createdAt = row.created_at ? new Date(row.created_at).getTime() : NaN;
                  if (!Number.isNaN(createdAt) && createdAt >= recentThreshold) {
                    recentSharedEventCounts.set(
                      candidateId,
                      (recentSharedEventCounts.get(candidateId) ?? 0) + 1
                    );
                  }

                  if (!sharedEventTitleByCandidate.has(candidateId)) {
                    const title = eventTitleById.get(row.event_id);
                    if (title) sharedEventTitleByCandidate.set(candidateId, title);
                  }
                }
              }

              if (eventRowsErr) {
                console.error("Failed to load shared-event titles:", eventRowsErr);
              }
            }
          }
        }

        const prioritizedCandidateIds = Array.from(
          new Set([...sharedEventCounts.keys(), ...mutualCounts.keys()])
        ).slice(0, 80);

        const prioritizedProfilesPromise = prioritizedCandidateIds.length
          ? supabase
              .from("profiles")
              .select("id,display_name,username,avatar_url")
              .in("id", prioritizedCandidateIds)
          : Promise.resolve({ data: [], error: null });

        const fallbackProfilesPromise = supabase
          .from("profiles")
          .select("id,display_name,username,avatar_url")
          .neq("id", user.id)
          .not("username", "is", null)
          .limit(80);

        const [{ data: prioritizedProfiles, error: prioritizedErr }, { data: fallbackProfiles, error: fallbackErr }] =
          await Promise.all([prioritizedProfilesPromise, fallbackProfilesPromise]);

        const pErr = prioritizedErr ?? fallbackErr;
        const profiles = [
          ...((prioritizedProfiles ?? []) as SuggestedProfile[]),
          ...((fallbackProfiles ?? []) as SuggestedProfile[]),
        ];

        if (pErr) {
          console.error("Failed to load suggested profiles:", pErr);
          toast.error(pErr.message ?? "Could not load suggestions");
          setSuggested([]);
        } else {
          const prioritized = profiles
            .filter((r) => !!r.id && !!r.username && !connectedIds.has(r.id) && !blockedIds.has(r.id))
            .filter(
              (profile, index, arr) => arr.findIndex((candidate) => candidate.id === profile.id) === index
            )
            .map((r) => {
              const next: SuggestedProfile = {
                ...r,
                mutualCount: mutualCounts.get(r.id) ?? 0,
                mutualPreview: (mutualPreviewByCandidate.get(r.id) ?? []).slice(0, 2),
                sharedEventCount: sharedEventCounts.get(r.id) ?? 0,
                recentSharedEventCount: recentSharedEventCounts.get(r.id) ?? 0,
                sharedEventTitle: sharedEventTitleByCandidate.get(r.id) ?? null,
              };
              next.reason = suggestionReason(next);
              return next;
            })
            .sort((a, b) => {
              const aScore =
                (a.sharedEventCount ?? 0) * 12 +
                (a.recentSharedEventCount ?? 0) * 6 +
                (a.mutualCount ?? 0) * 5;
              const bScore =
                (b.sharedEventCount ?? 0) * 12 +
                (b.recentSharedEventCount ?? 0) * 6 +
                (b.mutualCount ?? 0) * 5;
              if (bScore !== aScore) return bScore - aScore;
              const aName = (a.display_name || a.username || "").toLowerCase();
              const bName = (b.display_name || b.username || "").toLowerCase();
              return aName.localeCompare(bName);
            })
            .slice(0, 20);
          setSuggested(prioritized);
        }
      } catch (error) {
        console.error("Failed to hydrate friend suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    void loadSuggestions();
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
      toast.success(`${unlockCopy} @${row.username} is now in your friends.`);
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
    if (authLoading) return;
    void loadFriends();
  }, [authLoading, user?.id]);

  const handleShareInvite = async (placement: "friends_intro" | "friends_sticky_cta") => {
    if (sharingInvite) return;

    setSharingInvite(true);
    track("invite_cta_clicked", {
      source: "profile_share",
      placement,
    });

    try {
      const channel = await shareInviteLink({
        source: "profile_share",
      });
      if (channel === "share_canceled") return;
      toast.success(channel === "copy_fallback" ? "Invite link copied" : "Invite shared");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not share invite");
    } finally {
      setSharingInvite(false);
    }
  };

  const handleBlockUser = async (userId: string, label: string) => {
    const ok = window.confirm(`Block ${label}? They will be removed from your friends and no longer see your attendance.`);
    if (!ok) return;

    setSafetyWorkingId(userId);
    try {
      await blockUser(userId);
      toast.success(`${label} blocked`);
      await loadFriends();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not block user");
    } finally {
      setSafetyWorkingId(null);
    }
  };

  const handleReportUser = async (userId: string, label: string) => {
    const confirmed = window.confirm(`Report ${label}? This sends the profile to admin review.`);
    if (!confirmed) return;

    const details = window.prompt(`What should we know about ${label}?`, "Spam, harassment, fake profile, or something else");
    if (details === null) return;

    setSafetyWorkingId(userId);
    try {
      await reportUser({
        targetUserId: userId,
        reason: "user_report",
        details,
      });
      toast.success("Report submitted");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not submit report");
    } finally {
      setSafetyWorkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black px-5 py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] text-white sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Friends</h1>

      {onboardingMode ? (
        <div className="mb-6 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">Step 1: bring friends in</div>
          <div className="mt-1 text-xs text-zinc-300">
            Add one friend, then we'll send you straight to the best moves.
          </div>
        </div>
      ) : null}

      {friendUnlockMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">{friendUnlockMessage}</div>
          <div className="mt-1 text-xs text-zinc-300">
            More friends means sharper picks, stronger social proof, and faster decisions.
          </div>
        </div>
      ) : null}

      {!loading ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-100">Bring friends in early</div>
          <div className="mt-1 text-xs text-zinc-400">
            More friends means stronger picks and more moves that actually happen.
          </div>
          <button
            type="button"
            onClick={() => void handleShareInvite("friends_intro")}
            disabled={sharingInvite}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/15 px-4 py-2 text-sm font-semibold text-pink-50 hover:bg-pink-500/20 disabled:opacity-60"
          >
            <ShareIcon color="currentColor" className="h-4 w-4" />
            {sharingInvite ? "Sharing..." : "Share invite"}
          </button>
        </div>
      ) : null}

      {!loading && !suggestionsHidden ? (
        <div className="mb-8">
          <h2 className="mb-2 text-xl font-bold">Already Here</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Start with one person you actually go out with. The app gets better immediately.
          </p>

          {loadingSuggestions ? (
            <div className="text-zinc-500">Looking for the strongest people to pull in...</div>
          ) : suggested.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
              <div className="text-sm font-semibold text-white">No more strong suggestions right now</div>
              <div className="mt-1 text-sm text-zinc-400">
                That is okay. The fastest next move is either to share your invite or add one person you actually go out with.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleShareInvite("friends_intro")}
                  disabled={sharingInvite}
                  className="inline-flex items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/15 px-4 py-2 text-sm font-semibold text-pink-50 hover:bg-pink-500/20 disabled:opacity-60"
                >
                  <ShareIcon color="currentColor" className="h-4 w-4" />
                  {sharingInvite ? "Sharing..." : "Share invite"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/explore")}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/15"
                >
                  Find a move first
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {suggested.map((p) => {
                const displayName = p.display_name?.trim() || p.username || "Anon";
                const handle = profileHandle(p.username);
                const avatar = p.avatar_url ?? "";
                const adding = !!addingIds[p.id];
                const added = !!addedIds[p.id];

                return (
                  <PersonCard
                    key={p.id}
                    displayName={displayName}
                    handle={handle}
                    avatar={avatar}
                    body={p.reason ?? mutualPreviewText(p.mutualPreview ?? [], p.mutualCount ?? 0)}
                    action={
                      <button
                        onClick={() => addSuggestedFriend(p)}
                        disabled={adding || added || !viewerId || featureFlags.killSwitchFriendAdds}
                        className="inline-flex min-w-[5.5rem] justify-center rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {adding ? "Adding..." : added ? "Added" : "Add"}
                      </button>
                    }
                    footer={
                      <div className="text-[11px] text-zinc-500">
                        Safety actions appear after someone is in your friends.
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm">
            <button onClick={hideSuggestions} className="text-zinc-400 transition-colors hover:text-white">
              Not now
            </button>
            <span className="text-zinc-600">You can come back anytime.</span>
          </div>
        </div>
      ) : null}

      {!loading && suggestionsHidden ? (
        <div className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3">
          <div className="text-sm text-zinc-400">Suggestions hidden for now.</div>
          <button
            onClick={showSuggestionsAgain}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15"
          >
            Show again
          </button>
        </div>
      ) : null}

      {!loading && pending.length > 0 ? (
        <div className="mb-8">
          <h2 className="mb-2 text-xl font-bold">Pending</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {pending.map((f) => {
              const displayName =
                f.friend_profile?.display_name?.trim() || f.friend_profile?.username || "Anon";
              const handle = profileHandle(f.friend_profile?.username);
              const avatar = f.friend_profile?.avatar_url ?? "";

              return (
                <PersonCard
                  key={f.friend_id}
                  displayName={displayName}
                  handle={handle}
                  avatar={avatar}
                  eyebrow="Pending"
                  body="Request sent."
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="text-zinc-400">Loading your friends...</div>
      ) : friends.length === 0 && pending.length === 0 ? (
        <div className="mb-6 text-zinc-500">
          Nobody here yet. Add one real friend and this starts making sense fast.
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {friends.map((f) => {
            const displayName =
              f.friend_profile?.display_name?.trim() || f.friend_profile?.username || "Anon";
            const handle = profileHandle(f.friend_profile?.username);
            const avatar = f.friend_profile?.avatar_url ?? "";

            return (
              <PersonCard
                key={f.friend_id}
                displayName={displayName}
                handle={handle}
                avatar={avatar}
                eyebrow="Friend"
                body="In your friends."
                footer={
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReportUser(f.friend_id, displayName)}
                      disabled={safetyWorkingId === f.friend_id}
                      className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBlockUser(f.friend_id, displayName)}
                      disabled={safetyWorkingId === f.friend_id}
                      className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      Block
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <div className="mb-10">
        <AddFriend
          sticky={false}
          onSuccess={async () => {
            await loadFriends();
            setFriendUnlockMessage("Nice. Your moves just got sharper.");
            toast.success("Nice. Your moves just got sharper.");
            if (onboardingMode) {
              navigate("/explore?onboarding=1", { replace: true });
            }
          }}
        />
      </div>
    </div>
  );
}
