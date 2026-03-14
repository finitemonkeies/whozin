import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/providers/AuthProvider";

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

type ChecklistState = {
  loading: boolean;
  items: ChecklistItem[];
};

export function ActivationChecklist() {
  const [state, setState] = useState<ChecklistState>({ loading: true, items: [] });
  const { loading: authLoading, user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (authLoading) return;
      const userId = user?.id;

      if (!userId) {
        if (!cancelled) {
          setState({ loading: false, items: [] });
        }
        return;
      }

      const [profileRes, friendIdsRes, attendeeCountRes, inviteCountRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("username,avatar_url,onboarding_complete")
          .eq("id", userId)
          .maybeSingle(),
        supabase.rpc("get_friend_ids"),
        supabase
          .from("attendees")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("product_events")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("event_name", "invite_sent"),
      ]);

      const profile = profileRes.data;
      const items: ChecklistItem[] = [
        {
          key: "profile",
          label: "Claim your handle",
          description: "Lock your @ so shares and social proof feel like you.",
          href: "/profile/edit",
          cta: "Finish it",
          done:
            !!profile?.username &&
            !!profile?.avatar_url &&
            profile?.onboarding_complete === true,
        },
        {
          key: "friends",
          label: "Bring in one friend",
          description: "Whozin gets way better once your people are in.",
          href: "/friends",
          cta: "Bring your crew",
          done: Array.isArray(friendIdsRes.data) && friendIdsRes.data.length > 0,
        },
        {
          key: "rsvp",
          label: "Lock one plan",
          description: "Say you're in once and the night starts to take shape.",
          href: "/explore",
          cta: "Find the move",
          done: (attendeeCountRes.count ?? 0) > 0,
        },
        {
          key: "invite",
          label: "Send one invite",
          description: "One clean share is usually enough to get the night moving.",
          href: "/profile",
          cta: "Start the group chat",
          done: (inviteCountRes.count ?? 0) > 0,
        },
      ];

      if (!cancelled) {
        setState({ loading: false, items });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const completedCount = useMemo(
    () => state.items.filter((item) => item.done).length,
    [state.items]
  );
  const totalCount = state.items.length;

  if (state.loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/55 p-4">
        <div className="text-sm text-zinc-400">Checking your signal...</div>
      </div>
    );
  }

  if (totalCount === 0 || completedCount === totalCount) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-fuchsia-400/20 bg-zinc-900/60 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-200">
            <Sparkles className="h-3.5 w-3.5" />
            Get It Moving
          </div>
          <div className="mt-3 text-lg font-semibold text-white">
            {completedCount} of {totalCount} done
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            Start with friends, RSVPs, and one share. That's when this starts to hit.
          </div>
        </div>
        <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
          {Math.round((completedCount / totalCount) * 100)}%
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      <div className="mt-4 space-y-3">
        {state.items.map((item) => (
          <Link
            key={item.key}
            to={item.href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 hover:border-white/20 hover:bg-black/35"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${
                  item.done
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                    : "border-white/15 bg-white/5 text-zinc-500"
                }`}
              >
                {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">+</span>}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{item.description}</div>
              </div>
            </div>
            <div className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-zinc-300">
              {item.done ? "Locked" : item.cta}
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
