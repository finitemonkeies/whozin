import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, Ticket } from "lucide-react";
import type { Event } from "../../data/mock";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";

function safeTitle(title?: string | null) {
  const t = (title ?? "").trim();
  return t.length > 0 ? t : "Event";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function EventCard({ event }: { event: Event }) {
  const title = useMemo(() => safeTitle(event.title), [event.title]);
  const didTrackImpression = useRef(false);
  const canOpenDetails = isUuid(event.id);
  const hasTicketUrl = !!event.ticketUrl;

  const hasImageProp = !!event.image && event.image.trim().length > 0;
  const [imageOk, setImageOk] = useState(true);
  const showImage = hasImageProp && imageOk;
  const source = event.eventSource ?? "explore";
  const matchedArtist = (event.matchReason ?? "").toLowerCase().includes("like") ||
    (event.matchReason ?? "").toLowerCase().includes("suggested");

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

  const className =
    "group block rounded-2xl bg-zinc-900/55 border border-white/10 hover:border-white/20 transition overflow-hidden hover:-translate-y-0.5 duration-200";

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
    ]);

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

  const body = (
    <>
      <div className="relative h-44 bg-zinc-900">
        {showImage ? (
          <img
            src={event.image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageOk(false)}
          />
        ) : (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/25 to-pink-500/25" />
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />

            <div className="relative w-full h-full flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/25 border border-white/10">
                <Ticket className="w-4 h-4 text-white/80" />
                <span className="text-sm font-semibold text-white/80">No artwork yet</span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-tight truncate">{title}</div>
            <div className="mt-1 text-sm text-zinc-400 truncate">{event.date}</div>
          </div>

          {event.price ? (
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

          {typeof event.attendees === "number" ? (
            <div className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-500" />
              <span>{event.attendees.toLocaleString()} going</span>
            </div>
          ) : null}
        </div>

        {event.description ? (
          <div className="mt-3 text-sm text-zinc-500 leading-relaxed line-clamp-2">
            {event.description}
          </div>
        ) : null}

        {Array.isArray(event.tags) && event.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-800/70 border border-white/10 text-zinc-200"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          {canOpenDetails ? (
            <Link
              to={`/event/${event.id}?src=explore`}
              onClick={handleDetailClick}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 border border-white/10 hover:bg-white/15"
            >
              View details
            </Link>
          ) : (
            <span className="text-[11px] text-zinc-600">Preview only</span>
          )}

          {hasTicketUrl ? (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleBuyClick}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/25"
            >
              Buy Tickets
            </a>
          ) : null}
        </div>
      </div>
    </>
  );

  return <div className={className}>{body}</div>;
}
