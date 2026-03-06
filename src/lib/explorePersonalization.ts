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
  ticket_url?: string | null;
};

type TasteProfile = {
  artists: string[];
  genres: string[];
  suggestedArtists: string[];
};

type Recommendation = Event & {
  score: number;
  eventSource: string;
  matchReason: string;
  rankTier: number;
};

const DEFAULT_TASTE: TasteProfile = {
  artists: ["Tale of Us", "Charlotte de Witte", "Gareth Emery", "Eric Prydz", "Amelie Lens"],
  genres: ["techno", "melodic techno", "trance", "house"],
  suggestedArtists: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const surfaceIngestedSources =
  (import.meta.env.VITE_SURFACE_INGESTED_SOURCES as string | undefined) === "true";
const hiddenSources = new Set(["ra", "ticketmaster_artist", "ticketmaster_nearby", "eventbrite"]);

function canSurfaceSource(source: string | null | undefined): boolean {
  const s = (source ?? "").trim().toLowerCase();
  if (!s) return true;
  if (!hiddenSources.has(s)) return true;
  return surfaceIngestedSources;
}

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

function locationMatchesCity(eventLocation: string | null | undefined, cityHint: string): boolean {
  const hint = cityHint.trim();
  if (!hint) return true;
  return locationScore(eventLocation, hint) >= 0.34;
}

function affinityScore(
  row: InternalEventRow,
  taste: TasteProfile
): { score: number; reason: string; matchTier: number } {
  const text = normalize([row.title, row.description, row.location].filter(Boolean).join(" "));
  let hits = 0;
  let reason = "General music match";
  let matchTier = 0;

  for (const artist of taste.artists) {
    if (!artist.trim()) continue;
    if (text.includes(normalize(artist))) {
      hits += 3;
      reason = `Because you like ${artist}`;
      matchTier = 3;
      break;
    }
  }

  for (const genre of taste.genres) {
    if (!genre.trim()) continue;
    if (text.includes(normalize(genre))) hits += 1;
  }

  for (const artist of taste.suggestedArtists) {
    if (!artist.trim()) continue;
    if (text.includes(normalize(artist))) {
      hits += 2;
      if (reason === "General music match") {
        reason = `Suggested from your taste: ${artist}`;
      }
      matchTier = Math.max(matchTier, 2);
      break;
    }
  }

  if (matchTier === 0 && hits > 0) {
    matchTier = 1;
  }

  const score = Math.min(1, hits / 5);
  return { score, reason, matchTier };
}

async function getSpotifyTasteProfile(): Promise<TasteProfile> {
  try {
    const stored = localStorage.getItem("whozin_spotify_taste");
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<TasteProfile>;
      const artists = Array.isArray(parsed.artists) ? parsed.artists.filter(Boolean) : [];
      const genres = Array.isArray(parsed.genres) ? parsed.genres.filter(Boolean) : [];
      if (artists.length > 0 || genres.length > 0) {
        const suggestedArtists = Array.isArray((parsed as any).suggestedArtists)
          ? ((parsed as any).suggestedArtists as string[]).filter(Boolean)
          : [];
        return {
          artists: artists.length > 0 ? artists : DEFAULT_TASTE.artists,
          genres: genres.length > 0 ? genres : DEFAULT_TASTE.genres,
          suggestedArtists,
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
    .select("id,title,location,event_date,event_end_date,image_url,description,event_source,ticket_url")
    .order("event_date", { ascending: true })
    .limit(120);

  if (error) throw error;
  const rows = (data ?? []) as InternalEventRow[];

  const nowTs = Date.now();
  return rows.filter((r) => {
    if (!canSurfaceSource(r.event_source)) return false;
    const startTs = r.event_date ? new Date(r.event_date).getTime() : NaN;
    const endTs = r.event_end_date ? new Date(r.event_end_date).getTime() : startTs;
    if (Number.isNaN(startTs)) return true;
    if (Number.isNaN(endTs)) return startTs >= nowTs;
    return endTs >= nowTs;
  });
}

async function fetchTicketmasterKeywordEvents(
  cityHint: string,
  keyword: string,
  apiKey: string
): Promise<InternalEventRow[]> {
  if (!cityHint.trim() || !keyword.trim()) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    city: cityHint,
    classificationName: "music",
    keyword,
    size: "15",
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
      description: attractions
        ? `Matched artist: ${keyword}. Featuring: ${attractions}`
        : `Matched artist: ${keyword}`,
      event_source: "ticketmaster_artist",
      ticket_url: e?.url ?? null,
    } as InternalEventRow;
  });
}

async function fetchTicketmasterNearbyFallback(
  cityHint: string,
  apiKey: string
): Promise<InternalEventRow[]> {
  if (!cityHint.trim()) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    city: cityHint,
    classificationName: "music",
    size: "30",
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
      description: attractions ? `Nearby live event. Featuring: ${attractions}` : "Nearby live event",
      event_source: "ticketmaster_nearby",
      ticket_url: e?.url ?? null,
    } as InternalEventRow;
  });
}

async function fetchTicketmasterEvents(cityHint: string, taste: TasteProfile): Promise<InternalEventRow[]> {
  if (!surfaceIngestedSources) return [];
  const apiKey = (import.meta.env.VITE_TICKETMASTER_API_KEY as string | undefined)?.trim();
  if (!apiKey || !cityHint.trim()) return [];

  const artistQueries = [...taste.artists.slice(0, 6), ...taste.suggestedArtists.slice(0, 4)];
  const uniqueQueries = Array.from(
    new Set(artistQueries.map((q) => q.trim()).filter((q) => q.length > 0))
  ).slice(0, 8);

  if (uniqueQueries.length === 0) return [];

  const artistResults = await Promise.all(
    uniqueQueries.map((artist) => fetchTicketmasterKeywordEvents(cityHint, artist, apiKey))
  );

  const nearby = await fetchTicketmasterNearbyFallback(cityHint, apiKey);
  return [...artistResults.flat(), ...nearby];
}

function toUiEvent(
  row: InternalEventRow,
  score: number,
  reason: string,
  rankTier: number,
  overrides?: {
    attendees?: number;
    tags?: string[];
    price?: string;
    description?: string;
    eventSource?: string;
  }
): Recommendation {
  const eventSource = overrides?.eventSource ?? row.event_source ?? "internal";
  return {
    id: row.id,
    title: row.title,
    date: formatDateLabel(row.event_date),
    location: row.location ?? "Location TBD",
    image: row.image_url ?? "",
    attendees: overrides?.attendees ?? 0,
    price: overrides?.price ?? "RSVP",
    description: overrides?.description ?? row.description ?? reason,
    tags: (overrides?.tags ?? [reason, eventSource]).filter(Boolean),
    ticketUrl: row.ticket_url ?? undefined,
    score,
    eventSource,
    matchReason: reason,
    rankTier,
  };
}

type AttendeeRow = {
  event_id: string;
  user_id: string;
  created_at: string | null;
};

export async function loadTrendingExplore(cityHint: string): Promise<Recommendation[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const viewerId = sessionData.session?.user?.id ?? null;

  const { data: internalRows, error: eventsErr } = await supabase
    .from("events")
    .select("id,title,location,event_date,event_end_date,image_url,description,event_source,ticket_url")
    .order("event_date", { ascending: true })
    .limit(250);
  if (eventsErr) throw eventsErr;

  const nowTs = Date.now();
  const upcoming = ((internalRows ?? []) as InternalEventRow[]).filter((r) => {
    if (!canSurfaceSource(r.event_source)) return false;
    const startTs = r.event_date ? new Date(r.event_date).getTime() : NaN;
    const endTs = r.event_end_date ? new Date(r.event_end_date).getTime() : startTs;
    if (Number.isNaN(startTs)) return false;
    if (Number.isNaN(endTs)) return startTs >= nowTs;
    return endTs >= nowTs;
  });

  const cityScoped = upcoming.filter((r) => locationMatchesCity(r.location, cityHint));
  const pool = cityScoped.length > 0 ? cityScoped : upcoming;
  if (pool.length === 0) return [];

  const eventIds = pool.map((r) => r.id);
  const { data: attendeeRows, error: attendeesErr } = await supabase
    .from("attendees")
    .select("event_id,user_id,created_at")
    .in("event_id", eventIds);
  if (attendeesErr) throw attendeesErr;

  const byEvent = new Map<
    string,
    {
      total: number;
      recent7: number;
      users: Set<string>;
      viewerGoing: boolean;
    }
  >();

  const recentThreshold = Date.now() - 7 * DAY_MS;
  for (const row of (attendeeRows ?? []) as AttendeeRow[]) {
    const id = row.event_id;
    if (!id) continue;
    if (!byEvent.has(id)) {
      byEvent.set(id, { total: 0, recent7: 0, users: new Set<string>(), viewerGoing: false });
    }
    const agg = byEvent.get(id)!;
    if (agg.users.has(row.user_id)) {
      if (viewerId && row.user_id === viewerId) agg.viewerGoing = true;
      continue;
    }
    agg.users.add(row.user_id);
    agg.total += 1;
    const createdTs = row.created_at ? new Date(row.created_at).getTime() : NaN;
    if (!Number.isNaN(createdTs) && createdTs >= recentThreshold) agg.recent7 += 1;
    if (viewerId && row.user_id === viewerId) agg.viewerGoing = true;
  }

  const ranked = pool
    .map((row) => {
      const agg = byEvent.get(row.id) ?? {
        total: 0,
        recent7: 0,
        users: new Set<string>(),
        viewerGoing: false,
      };
      return { row, ...agg };
    })
    .filter((r) => r.total > 0 && !r.viewerGoing)
    .map(({ row, total, recent7 }) => {
      const date = dateProximityScore(row.event_date);
      const velocity = Math.min(1, recent7 / 8);
      const volume = Math.min(1, total / 25);
      const score = Number((velocity * 0.5 + volume * 0.35 + date * 0.15).toFixed(4));
      const reason = recent7 > 0 ? `Trending now (${recent7} new RSVPs)` : "Popular nearby";
      return toUiEvent(row, score, reason, 2, {
        attendees: total,
        tags: ["Trending", row.event_source ?? "internal"],
        description:
          row.description ??
          `${total} people are going${recent7 > 0 ? `, with ${recent7} new RSVPs this week` : ""}.`,
      });
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.attendees ?? 0) - (a.attendees ?? 0);
    })
    .slice(0, 12);

  return ranked;
}

export async function loadPersonalizedExplore(cityHint: string): Promise<Recommendation[]> {
  const taste = await getSpotifyTasteProfile();
  const [internal, ticketmaster] = await Promise.all([
    fetchInternalEvents(),
    fetchTicketmasterEvents(cityHint, taste),
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
      const hasArtistMatch = affinity.matchTier >= 2;
      const hasNearbyMatch = cityHint.trim().length > 0 ? geo >= 0.34 : true;
      const rankTier = hasArtistMatch ? 3 : hasNearbyMatch ? 2 : 1;
      return toUiEvent(row, Number(score.toFixed(4)), affinity.reason, rankTier);
    })
    .sort((a, b) => {
      if (a.rankTier !== b.rankTier) return b.rankTier - a.rankTier;
      const aExternal = a.eventSource.startsWith("ticketmaster") ? 1 : 0;
      const bExternal = b.eventSource.startsWith("ticketmaster") ? 1 : 0;
      if (aExternal !== bExternal) return bExternal - aExternal;
      const aValid = isUuid(a.id) ? 1 : 0;
      const bValid = isUuid(b.id) ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;
      return b.score - a.score;
    })
    .slice(0, 40);

  return ranked;
}
