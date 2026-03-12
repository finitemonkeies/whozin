import { ArrowUpRight, MapPin } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { MoveSignal } from "@/lib/theMove";
import { TheMoveBadge } from "@/app/components/TheMoveBadge";
import { track } from "@/lib/analytics";
import { logProductEvent } from "@/lib/productEvents";

export function TheMoveHero({
  eventId,
  title,
  context,
  meta,
  signal,
  source,
}: {
  eventId: string;
  title: string;
  context: string;
  meta: string;
  signal: MoveSignal;
  source: "home" | "explore";
}) {
  useEffect(() => {
    track("the_move_impression", {
      source,
      placement: `${source}_hero`,
      eventId,
      label: signal.label,
      score: signal.score,
    });
    void logProductEvent({
      eventName: "the_move_impression",
      eventId,
      source,
      metadata: {
        placement: `${source}_hero`,
        label: signal.label,
        score: signal.score,
      },
    });
  }, [eventId, signal.label, signal.score, source]);

  return (
    <Link
      to={`/event/${eventId}?src=${source}_the_move`}
      onClick={() => {
        track("the_move_click", {
          source,
          placement: `${source}_hero`,
          eventId,
          label: signal.label,
        });
        void logProductEvent({
          eventName: "the_move_click",
          eventId,
          source,
          metadata: {
            placement: `${source}_hero`,
            label: signal.label,
          },
        });
      }}
      className="group relative block overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_38%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.24),transparent_34%),rgba(24,24,27,0.88)] px-4 py-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:px-5 sm:py-5"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%,rgba(255,255,255,0.02))]" />
      <div className="relative">
        <TheMoveBadge signal={signal} showSecondary />
        <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500 sm:text-[11px]">
          {context}
        </div>
        <div className="mt-2 text-[1.65rem] font-bold leading-tight text-white sm:text-2xl">{title}</div>
        <div className="mt-2 max-w-[32rem] text-sm leading-relaxed text-zinc-300">
          {signal.explainer}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="inline-flex min-w-0 items-center gap-2 text-sm text-zinc-300">
            <MapPin className="h-4 w-4 flex-shrink-0 text-zinc-500" />
            <span className="truncate">{meta}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-sm font-semibold text-white transition group-hover:text-pink-200">
            See why
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MakeTheMoveHero({
  title,
  body,
  ctaLabel,
  to,
  source,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  to: string;
  source: "home" | "explore";
}) {
  useEffect(() => {
    track("the_move_impression", {
      source,
      placement: `${source}_hero_fallback`,
      eventId: null,
      label: "Make The Move",
    });
    void logProductEvent({
      eventName: "the_move_impression",
      source,
      metadata: {
        placement: `${source}_hero_fallback`,
        label: "Make The Move",
      },
    });
  }, [source]);

  return (
    <Link
      to={to}
      onClick={() => {
        track("the_move_click", {
          source,
          placement: `${source}_hero_fallback`,
          eventId: null,
          label: "Make The Move",
        });
        void logProductEvent({
          eventName: "the_move_click",
          source,
          metadata: {
            placement: `${source}_hero_fallback`,
            label: "Make The Move",
          },
        });
      }}
      className="group relative block overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.2),transparent_32%),rgba(24,24,27,0.88)] px-4 py-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:px-5 sm:py-5"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%,rgba(255,255,255,0.02))]" />
      <div className="relative">
        <div className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
          Make The Move
        </div>
        <div className="mt-4 text-[1.65rem] font-bold leading-tight text-white sm:text-2xl">{title}</div>
        <div className="mt-2 max-w-[32rem] text-sm leading-relaxed text-zinc-300">{body}</div>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white transition group-hover:text-pink-200">
          {ctaLabel}
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
