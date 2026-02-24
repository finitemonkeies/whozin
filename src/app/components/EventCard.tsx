import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, Ticket } from "lucide-react";
import type { Event } from "../../data/mock";

function safeTitle(title?: string | null) {
  const t = (title ?? "").trim();
  return t.length > 0 ? t : "Event";
}

export function EventCard({ event }: { event: Event }) {
  const title = useMemo(() => safeTitle(event.title), [event.title]);

  const hasImageProp = !!event.image && event.image.trim().length > 0;
  const [imageOk, setImageOk] = useState(true);

  const showImage = hasImageProp && imageOk;

  return (
    <Link
      to={`/event/${event.id}`}
      className="group block rounded-2xl bg-zinc-900/55 border border-white/10 hover:border-white/20 transition overflow-hidden hover:-translate-y-0.5 duration-200"
    >
      {/* Media */}
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
            {/* Premium fallback — no initials */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/25 to-pink-500/25" />
            <div className="absolute inset-0 bg-black/35" />

            {/* Soft “badge-like” glow element */}
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

        {/* Subtle fade to connect to body */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
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

        {/* Meta row */}
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

        {/* Description */}
        {event.description ? (
          <div className="mt-3 text-sm text-zinc-500 leading-relaxed line-clamp-2">
            {event.description}
          </div>
        ) : null}

        {/* Tags */}
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

        <div className="mt-4 text-[11px] text-zinc-600 group-hover:text-zinc-500 transition">
          View details →
        </div>
      </div>
    </Link>
  );
}