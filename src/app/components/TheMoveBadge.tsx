import { Flame, TrendingUp, Users } from "lucide-react";
import type { MoveSignal } from "@/lib/theMove";

function iconForStatus(status: MoveSignal["status"]) {
  switch (status) {
    case "the_move":
      return Flame;
    case "building_fast":
      return TrendingUp;
    default:
      return Users;
  }
}

function stylesForStatus(status: MoveSignal["status"]) {
  switch (status) {
    case "the_move":
      return "border-fuchsia-400/50 bg-[linear-gradient(135deg,rgba(236,72,153,0.28),rgba(139,92,246,0.24))] text-white shadow-[0_0_32px_rgba(236,72,153,0.18)]";
    case "building_fast":
      return "border-violet-400/35 bg-violet-500/10 text-violet-100";
    case "trending_with_your_circle":
      return "border-pink-400/35 bg-pink-500/10 text-pink-100";
    case "your_friends_are_going":
      return "border-white/15 bg-white/8 text-zinc-100";
    case "might_be_the_move":
      return "border-white/15 bg-white/8 text-zinc-100";
  }
}

export function TheMoveBadge({
  signal,
  compact = false,
  showSecondary = false,
}: {
  signal: MoveSignal;
  compact?: boolean;
  showSecondary?: boolean;
}) {
  const Icon = iconForStatus(signal.status);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border backdrop-blur-md ${stylesForStatus(
        signal.status
      )} ${compact ? "px-2.5 py-1 text-[11px] font-semibold" : "px-3 py-1.5 text-xs font-semibold"}`}
      title={signal.explainer}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>{signal.label}</span>
      {showSecondary ? <span className="text-white/70">{signal.secondary}</span> : null}
    </div>
  );
}
