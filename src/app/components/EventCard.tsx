import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Ticket } from "lucide-react";
import type { Event } from "../../data/mock";
import { track } from "@/lib/analytics";
import type { MoveSignal } from "@/lib/theMove";
import { TheMoveBadge } from "@/app/components/TheMoveBadge";
import { EventArtwork } from "@/app/components/EventArtwork";
import { toast } from "sonner";
import { featureFlags } from "@/lib/featureFlags";
import { shareInviteLink } from "@/lib/inviteSharing";
import { FriendsGoingIcon, LocationIcon, RSVPIcon, ShareIcon } from "@/app/components/WhozinIcons";

type QuickRsvpState = {
  going: boolean;
  working: boolean;
  count?: number;
  friendCount?: number;
  onToggle: () => void;
};

function safeTitle(title?: string | null) {
  const t = (title ?? "").trim();
  return t.length > 0 ? t : "Event";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function logProductEventLazy(
  ...args: Parameters<typeof import("@/lib/productEvents")["then"] extends never ? never : never>
) {
  return import("@/lib/productEvents").then(({ logProductEvent }) =>
    // @ts-expect-error typed through call sites below
    logProductEvent(...args)
  );
}

export function EventCard({
  event,
  quickRsvp,
  moveSignal,
  surface = "explore",
  inviteSource,
}: {
  event: Event;
  quickRsvp?: QuickRsvpState;
  moveSignal?: MoveSignal | null;
  surface?: string;
  inviteSource?: "rsvp_share" | "profile_share" | "event_detail_share" | "share_link";
}) {
  const navigate = useNavigate();
  const title = useMemo(() => safeTitle(event.title), [event.title]);
  const didTrackImpression = useRef(false);
  const canOpenDetails = isUuid(event.id);
  const hasTicketUrl = !!event.ticketUrl;

  const source = event.eventSource ?? "explore";
  const matchedArtist =
    (event.matchReason ?? "").toLowerCase().includes("like") ||
    (event.matchReason ?? "").toLowerCase().includes("suggested");
  const visibleTags = useMemo(
    () =>
      (Array.isArray(event.tags) ? event.tags : [])
        .filter((tag) => tag.trim().toLowerCase() !== "internal")
        .slice(0, 3),
    [event.tags]
  );
  const detailHref = canOpenDetails ? `/event/${event.id}?src=${surface}` : null;

  useEffect(() => {
    if (didTrackImpression.current) return;
    didTrackImpression.current = true;

    void logProductEventLazy({
      eventName: "explore_event_impression",
      eventId: canOpenDetails ? event.id : null,
      source: "explore",
      metadata: {
        source,
        matched_artist: matchedArtist,
        has_ticket_url: hasTicketUrl,
      },
    });
  }, [canOpenDetails, event.id, hasTicketUrl, matchedArtist, source]);

  useEffect(() => {
    if (!moveSignal) return;

    track("the_move_impression", {
      source: surface,
      placement: `${surface}_card`,
      eventId: canOpenDetails ? event.id : null,
      label: moveSignal.label,
      score: moveSignal.score,
    });

    void logProductEventLazy({
      eventName: "the_move_impression",
      eventId: canOpenDetails ? event.id : null,
      source: surface,
      metadata: {
        placement: `${surface}_card`,
        label: moveSignal.label,
        score: moveSignal.score,
      },
    });
  }, [canOpenDetails, event.id, moveSignal, surface]);

  const className = `group overflow-hidden rounded-[26px] border border-white/10 bg-zinc-900/70 shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 ${
    canOpenDetails
      ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70"
      : ""
  }`;

  const handleDetailClick = () =>
    void Promise.all([
      logProductEventLazy({
        eventName: "explore_event_click",
        eventId: canOpenDetails ? event.id : null,
        source: "explore",
        metadata: {
          source,
          matched_artist: matchedArtist,
        },
      }),
      Promise.resolve(
        track("event_view", {
          source: "explore_card",
          eventId: canOpenDetails ? event.id : null,
        })
      ),
      Promise.resolve(
        moveSignal
          ? track("the_move_click", {
              source: surface,
              placement: `${surface}_card`,
              eventId: canOpenDetails ? event.id : null,
              label: moveSignal.label,
            })
          : null
      ),
      moveSignal
        ? logProductEventLazy({
            eventName: "the_move_click",
            eventId: canOpenDetails ? event.id : null,
            source: surface,
            metadata: {
              placement: `${surface}_card`,
              label: moveSignal.label,
            },
          })
        : Promise.resolve(),
    ]);

  const handleOpenDetails = () => {
    if (!detailHref) return;
    handleDetailClick();
    navigate(detailHref);
  };

  const handleCardKeyDown = (eventKey: KeyboardEvent<HTMLDivElement>) => {
    if (!detailHref) return;
    if (eventKey.key !== "Enter" && eventKey.key !== " ") return;
    eventKey.preventDefault();
    handleOpenDetails();
  };

  const handleBuyClick = () =>
    void logProductEventLazy({
      eventName: "explore_buy_ticket_click",
      eventId: canOpenDetails ? event.id : null,
      source: "explore",
      metadata: {
        provider: source,
        external_event_id: event.id,
        matched_artist: matchedArtist,
      },
    });

  const handleShareClick = async () => {
    if (featureFlags.killSwitchInvites) {
      toast.error("Invites are down right now");
      return;
    }
    if (!canOpenDetails || !inviteSource) return;

    track("invite_cta_clicked", {
      source: inviteSource,
      placement: `${surface}_card`,
      eventId: event.id,
    });

    try {
      const channel = await shareInviteLink({
        eventId: event.id,
        eventTitle: title,
        source: inviteSource,
      });
      if (channel === "share_canceled") return;
      toast.success(channel === "copy_fallback" ? "Link copied" : "Shared");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not share that");
    }
  };

  const body = (
    <>
      <div className="relative h-40 bg-zinc-900 sm:h-44">
        <EventArtwork
          title={title}
          imageUrl={event.image}
          location={event.location}
          dateLabel={event.date}
          tags={visibleTags}
          badge={event.organizerProfileId ? "Partner event" : moveSignal?.secondary ?? null}
          className="h-full"
          titleClassName="text-[1.5rem] sm:text-[1.65rem]"
        />
        {moveSignal ? (
          <div className="absolute left-3 top-12 sm:left-4">
            <TheMoveBadge signal={moveSignal} compact />
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {moveSignal ? (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-300/90">
              {moveSignal.secondary}
            </div>
            <div className="mt-1 text-xs text-zinc-400">{moveSignal.explainer}</div>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {event.organizerProfileId ? (
              <div className="mb-2 inline-flex items-center rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                Partner event
              </div>
            ) : null}
            <div className="line-clamp-2 text-[18px] font-semibold leading-tight text-white">{title}</div>
            <div className="mt-1 text-sm text-zinc-400">{event.date}</div>
          </div>

          {quickRsvp ? (
            <button
              type="button"
              onClick={(eventClick) => {
                eventClick.stopPropagation();
                quickRsvp.onToggle();
              }}
              disabled={quickRsvp.working}
              data-no-card-nav="true"
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition active:scale-[0.99] disabled:opacity-60 ${
                quickRsvp.going
                  ? "bg-green-500/15 border-green-500/30 text-green-200"
                  : "whozin-brand-button border-white/10 text-white"
              }`}
            >
              <RSVPIcon color="currentColor" className="w-3.5 h-3.5" />
              {quickRsvp.working ? "Saving..." : quickRsvp.going ? "You're in" : "I'm going"}
            </button>
          ) : event.price ? (
            <div className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-white/90">
              <Ticket className="w-3.5 h-3.5" />
              {event.price}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
          {event.location ? (
            <div className="inline-flex items-center gap-1.5 max-w-full">
              <LocationIcon color="currentColor" className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          ) : null}

          {typeof (quickRsvp?.count ?? event.attendees) === "number" ? (
            <div className="inline-flex items-center gap-1.5">
              <FriendsGoingIcon color="currentColor" className="w-4 h-4 text-zinc-500" />
              <span>{(quickRsvp?.count ?? event.attendees).toLocaleString()} going</span>
            </div>
          ) : null}
        </div>

        {typeof quickRsvp?.friendCount === "number" && quickRsvp.friendCount > 0 ? (
          <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
            {quickRsvp.friendCount === 1
              ? "1 friend already in"
              : `${quickRsvp.friendCount} friends already in`}
          </div>
        ) : typeof (quickRsvp?.count ?? event.attendees) === "number" &&
          (quickRsvp?.count ?? event.attendees) > 0 ? (
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-zinc-300">
            {(quickRsvp?.count ?? event.attendees) === 1
              ? "Crowd just started"
              : "Crowd already forming"}
          </div>
        ) : null}

        {event.description ? (
          <div className="text-sm leading-relaxed text-zinc-500 line-clamp-2">
            {event.description}
          </div>
        ) : null}

        {visibleTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-800/70 border border-white/10 text-zinc-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-1">
          {canOpenDetails ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Open
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          ) : (
            <span className="text-[11px] text-zinc-600">Preview</span>
          )}

          {canOpenDetails && inviteSource ? (
            <button
              type="button"
              onClick={(eventClick) => {
                eventClick.stopPropagation();
                void handleShareClick();
              }}
              data-no-card-nav="true"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              <ShareIcon color="currentColor" className="h-3.5 w-3.5" />
              Share invite
            </button>
          ) : null}

          {hasTicketUrl ? (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(eventClick) => {
                eventClick.stopPropagation();
                handleBuyClick();
              }}
              data-no-card-nav="true"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/25"
            >
              Get tickets
            </a>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={className}
      onClick={canOpenDetails ? handleOpenDetails : undefined}
      onKeyDown={canOpenDetails ? handleCardKeyDown : undefined}
      role={canOpenDetails ? "link" : undefined}
      tabIndex={canOpenDetails ? 0 : undefined}
      aria-label={canOpenDetails ? `Open details for ${title}` : undefined}
    >
      {body}
    </div>
  );
}
