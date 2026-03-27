import type { MoveSignal } from "@/lib/theMove";
import { FriendsGoingIcon, HotIcon, TrendingIcon } from "@/app/components/WhozinIcons";

function iconForStatus(status: MoveSignal["status"]) {
  switch (status) {
    case "the_move":
      return HotIcon;
    case "building_fast":
      return TrendingIcon;
    default:
      return FriendsGoingIcon;
  }
}

function stylesForStatus(status: MoveSignal["status"]) {
  switch (status) {
    case "the_move":
      return "border-fuchsia-300/70 bg-[linear-gradient(135deg,rgba(17,17,19,0.78),rgba(236,72,153,0.26),rgba(139,92,246,0.22))] text-white shadow-[0_10px_30px_rgba(0,0,0,0.38)]";
    case "building_fast":
      return "border-violet-300/55 bg-[linear-gradient(135deg,rgba(17,17,19,0.8),rgba(139,92,246,0.24))] text-violet-50 shadow-[0_10px_28px_rgba(0,0,0,0.34)]";
    case "trending_with_your_circle":
      return "border-pink-300/60 bg-[linear-gradient(135deg,rgba(17,17,19,0.82),rgba(236,72,153,0.24))] text-pink-50 shadow-[0_10px_28px_rgba(0,0,0,0.34)]";
    case "your_friends_are_going":
      return "border-white/25 bg-[linear-gradient(135deg,rgba(17,17,19,0.82),rgba(255,255,255,0.1))] text-zinc-50 shadow-[0_10px_28px_rgba(0,0,0,0.34)]";
    case "might_be_the_move":
      return "border-white/25 bg-[linear-gradient(135deg,rgba(17,17,19,0.82),rgba(255,255,255,0.1))] text-zinc-50 shadow-[0_10px_28px_rgba(0,0,0,0.34)]";
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
      <Icon
        color="currentColor"
        className={compact ? "h-3.5 w-3.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]" : "h-4 w-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]"}
      />
      <span className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">{signal.label}</span>
      {showSecondary ? <span className="text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">{signal.secondary}</span> : null}
    </div>
  );
}
