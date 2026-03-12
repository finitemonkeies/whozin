import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, MapPin, Share2, Ticket, Users } from "lucide-react";
import type { Event } from "../../data/mock";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";
import type { MoveSignal } from "@/lib/theMove";
import { TheMoveBadge } from "@/app/components/TheMoveBadge";
import { toast } from "sonner";
import { featureFlags } from "@/lib/featureFlags";
import { shareInviteLink } from "@/lib/inviteSharing";

type QuickRsvpState = {
  going: boolean;
  working: boolean;
  count?: number;
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

const FALLBACK_ART_STYLES = [
  {
    background:
      "linear-gradient(135deg, rgba(236,72,153,0.95), rgba(124,58,237,0.9) 52%, rgba(15,23,42,0.98))",
    orbClass: "bg-pink-400/35",
    accentClass: "text-pink-100",
  },
  {
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88) 54%, rgba(9,9,11,0.98))",
    orbClass: "bg-violet-400/30",
    accentClass: "text-blue-100",
  },
  {
    background:
      "linear-gradient(135deg, rgba(244,63,94,0.95), rgba(249,115,22,0.88) 54%, rgba(9,9,11,0.98))",
    orbClass: "bg-orange-300/30",
    accentClass: "text-rose-100",
  },
];

function pickFallbackArt(seed: string) {
  const value = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_ART_STYLES[value % FALLBACK_ART_STYLES.length];
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

  const hasImageProp = !!event.image && event.image.trim().length > 0;
  const [imageOk, setImageOk] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const showImage = hasImageProp && imageOk;
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
  const fallbackArt = useMemo(
    () => pickFallbackArt(`${title}-${event.location}-${source}`),
    [event.location, source, title]
  );
  const fallbackLabel = useMemo(() => {
    if (visibleTags.length > 0) return visibleTags[0];
    if (source === "19hz") return "Bay Area";
    if (source === "ra") return "Nightlife";
    return "Tonight";
  }, [source, visibleTags]);
  const detailHref = canOpenDetails ? `/event/${event.id}?src=${surface}` : null;

  useEffect(() => {
    setImageLoaded(false);
    setImageOk(true);
  }, [event.id, event.image]);

  useEffect(() => {
    if (didTrackImpression.current) return;
    didTrackImpression.current = true;

    void logProductEvent({
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

    void logProductEvent({
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

  const className = `group rounded-2xl bg-zinc-900/55 border border-white/10 hover:border-white/20 transition overflow-hidden hover:-translate-y-0.5 duration-200 ${
    canOpenDetails
      ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70"
      : ""
  }`;

  const handleDetailClick = () =>
    void Promise.all([
      logProductEvent({
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
        ? logProductEvent({
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
    void logProductEvent({
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
      toast.error("Invites are temporarily unavailable");
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
      toast.success(channel === "copy_fallback" ? "Invite link copied" : "Invite shared");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not share invite");
    }
  };

  const body = (
    <>
      <div className="relative h-44 bg-zinc-900">
        {showImage ? (
          <>
            {!imageLoaded ? (
              <div className="absolute inset-0 animate-pulse bg-zinc-900/80" />
            ) : null}
            <img
              src={event.image}
              alt={title}
              className={`w-full h-full object-cover transition duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageOk(false)}
            />
          </>
        ) : (
          <div className="relative h-full w-full overflow-hidden" style={{ background: fallbackArt.background }}>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:22px_22px] opacity-25" />
            <div className={`absolute -left-8 -top-12 h-40 w-40 rounded-full blur-3xl ${fallbackArt.orbClass}`} />
            <div className="absolute -bottom-16 right-0 h-44 w-44 rounded-full bg-black/35 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

            <div className="relative flex h-full flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/85">
                  <Ticket className="h-3.5 w-3.5" />
                  Poster pending
                </div>
                <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${fallbackArt.accentClass}`}>
                  {fallbackLabel}
                </div>
              </div>

              <div className="max-w-[85%]">
                <div className="line-clamp-2 text-xl font-semibold leading-tight text-white">{title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleTags.slice(0, 2).map((tag) => (
                    <span
                      key={`art-${tag}`}
                      className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75"
                    >
                      {tag}
                    </span>
                  ))}
                  {!visibleTags.length && event.location ? (
                    <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                      {event.location}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        {moveSignal ? (
          <div className="absolute left-4 top-4">
            <TheMoveBadge signal={moveSignal} compact />
          </div>
        ) : null}
      </div>

      <div className="p-5">
        {moveSignal ? (
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-300/90">
              {moveSignal.secondary}
            </div>
            <div className="mt-1 text-xs text-zinc-400">{moveSignal.explainer}</div>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[18px] font-semibold leading-tight">{title}</div>
            <div className="mt-1 truncate text-sm text-zinc-400">{event.date}</div>
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
                  : "bg-gradient-to-r from-pink-600 to-purple-600 border-white/10 text-white"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              {quickRsvp.working ? "Saving..." : quickRsvp.going ? "You're going" : "RSVP"}
            </button>
          ) : event.price ? (
            <div className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-white/90">
              <Ticket className="w-3.5 h-3.5" />
              {event.price}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
          {event.location ? (
            <div className="inline-flex items-center gap-1.5 max-w-full">
              <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          ) : null}

          {typeof (quickRsvp?.count ?? event.attendees) === "number" ? (
            <div className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-500" />
              <span>{(quickRsvp?.count ?? event.attendees).toLocaleString()} going</span>
            </div>
          ) : null}
        </div>

        {event.description ? (
          <div className="mt-3 text-sm text-zinc-500 leading-relaxed line-clamp-2">
            {event.description}
          </div>
        ) : null}

        {visibleTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canOpenDetails ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Open event
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          ) : (
            <span className="text-[11px] text-zinc-600">Preview only</span>
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
              <Share2 className="h-3.5 w-3.5" />
              Share with one friend
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
              Buy Tickets
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
