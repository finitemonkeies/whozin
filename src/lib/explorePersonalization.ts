import { supabase } from "@/lib/supabase";
import type { Event } from "@/data/mock";

type InternalEventRow = {
  id: string;
  title: string;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description?: string | null;
  event_source?: string | null;
};

type TasteProfile = {
  artists: string[];
  genres: string[];
};

type Recommendation = Event & {
  score: number;
  eventSource: string;
  matchReason: string;
};

const DEFAULT_TASTE: TasteProfile = {
  artists: ["Tale of Us", "Charlotte de Witte", "Gareth Emery", "Eric Prydz", "Amelie Lens"],
  genres: ["techno", "melodic techno", "trance", "house"],
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function tokenize(value: string | null | undefined): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateProximityScore(eventDate: string | null | undefined): number {
  if (!eventDate) return 0.2;
  const t = new Date(eventDate).getTime();
  if (Number.isNaN(t)) return 0.2;
  const diffDays = Math.max(0, (t - Date.now()) / DAY_MS);
  if (diffDays <= 7) return 1.0;
  if (diffDays <= 30) return 0.7;
  if (diffDays <= 90) return 0.45;
  return 0.25;
}

function locationScore(eventLocation: string | null | undefined, cityHint: string): number {
  if (!cityHint.trim()) return 0.5;
  const eventTokens = new Set(tokenize(eventLocation));
  const cityTokens = tokenize(cityHint);
  if (cityTokens.length === 0) return 0.5;

  const overlap = cityTokens.filter((t) => eventTokens.has(t)).length;
  if (overlap === 0) return 0.1;
  return Math.min(1, overlap / cityTokens.length);
}

function affinityScore(row: InternalEventRow, taste: TasteProfile): { score: number; reason: string } {
  const text = normalize([row.title, row.description, row.location].filter(Boolean).join(" "));
  let hits = 0;
  let reason = "General music match";

  for (const artist of taste.artists) {
    if (!artist.trim()) continue;
    if (text.includes(normalize(artist))) {
      hits += 3;
      reason = `Because you like ${artist}`;
      break;
    }
  }

  for (const genre of taste.genres) {
    if (!genre.trim()) continue;
    if (text.includes(normalize(genre))) hits += 1;
  }

  const score = Math.min(1, hits / 5);
  return { score, reason };
}

async function getSpotifyTasteProfile(): Promise<TasteProfile> {
  try {
    const stored = localStorage.getItem("whozin_spotify_taste");
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<TasteProfile>;
      const artists = Array.isArray(parsed.artists) ? parsed.artists.filter(Boolean) : [];
      const genres = Array.isArray(parsed.genres) ? parsed.genres.filter(Boolean) : [];
      if (artists.length > 0 || genres.length > 0) {
        return {
          artists: artists.length > 0 ? artists : DEFAULT_TASTE.artists,
          genres: genres.length > 0 ? genres : DEFAULT_TASTE.genres,
        };
      }
    }
  } catch {
    // Fall back to defaults.
  }

  return DEFAULT_TASTE;
}

async function fetchInternalEvents(): Promise<InternalEventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,location,event_date,event_end_date,image_url,description,event_source")
    .order("event_date", { ascending: true })
    .limit(120);

  if (error) throw error;
  const rows = (data ?? []) as InternalEventRow[];

  const nowTs = Date.now();
  return rows.filter((r) => {
    const startTs = r.event_date ? new Date(r.event_date).getTime() : NaN;
    const endTs = r.event_end_date ? new Date(r.event_end_date).getTime() : startTs;
    if (Number.isNaN(startTs)) return true;
    if (Number.isNaN(endTs)) return startTs >= nowTs;
    return endTs >= nowTs;
  });
}

async function fetchTicketmasterEvents(cityHint: string): Promise<InternalEventRow[]> {
  const apiKey = (import.meta.env.VITE_TICKETMASTER_API_KEY as string | undefined)?.trim();
  if (!apiKey || !cityHint.trim()) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    city: cityHint,
    classificationName: "music",
    size: "40",
    sort: "date,asc",
  });

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const events = (json?._embedded?.events ?? []) as any[];

  return events.map((e) => {
    const attractions = ((e?._embedded?.attractions ?? []) as any[])
      .map((a) => a?.name)
      .filter(Boolean)
      .join(", ");

    return {
      id: `tm_${e.id}`,
      title: e?.name ?? "Live Event",
      location: [e?._embedded?.venues?.[0]?.name, e?._embedded?.venues?.[0]?.city?.name]
        .filter(Boolean)
        .join(", "),
      event_date: e?.dates?.start?.dateTime ?? null,
      event_end_date: null,
      image_url: Array.isArray(e?.images) ? e.images[0]?.url ?? null : null,
      description: attractions ? `Featuring: ${attractions}` : null,
      event_source: "ticketmaster",
    } as InternalEventRow;
  });
}

function toUiEvent(row: InternalEventRow, score: number, reason: string): Recommendation {
  return {
    id: row.id,
    title: row.title,
    date: formatDateLabel(row.event_date),
    location: row.location ?? "Location TBD",
    image: row.image_url ?? "",
    attendees: 0,
    price: "RSVP",
    description: row.description ?? reason,
    tags: [reason, row.event_source ?? "internal"].filter(Boolean),
    score,
    eventSource: row.event_source ?? "internal",
    matchReason: reason,
  };
}

export async function loadPersonalizedExplore(cityHint: string): Promise<Recommendation[]> {
  const [taste, internal, ticketmaster] = await Promise.all([
    getSpotifyTasteProfile(),
    fetchInternalEvents(),
    fetchTicketmasterEvents(cityHint),
  ]);

  const combined = [...internal, ...ticketmaster];
  const dedup = new Map<string, InternalEventRow>();
  for (const row of combined) dedup.set(row.id, row);

  const ranked = Array.from(dedup.values())
    .map((row) => {
      const affinity = affinityScore(row, taste);
      const geo = locationScore(row.location, cityHint);
      const date = dateProximityScore(row.event_date);
      const score = affinity.score * 0.55 + geo * 0.25 + date * 0.2;
      return toUiEvent(row, Number(score.toFixed(4)), affinity.reason);
    })
    .sort((a, b) => {
      const aValid = isUuid(a.id) ? 1 : 0;
      const bValid = isUuid(b.id) ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;
      return b.score - a.score;
    })
    .slice(0, 40);

  return ranked;
}
