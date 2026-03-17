import { supabase } from "@/lib/supabase";
import type { Event } from "@/data/mock";
import { canSurfaceSource, isEventVisible } from "@/lib/eventVisibility";

type InternalEventRow = {
  id: string;
  title: string;
  location: string | null;
  city?: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description?: string | null;
  event_source?: string | null;
  moderation_status?: string | null;
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

type ExploreCacheEnvelope = {
  savedAt: number;
  data: Recommendation[];
};

type AsyncCacheEnvelope<T> = {
  savedAt: number;
  promise: Promise<T>;
};

const DEFAULT_TASTE: TasteProfile = {
  artists: ["Tale of Us", "Charlotte de Witte", "Gareth Emery", "Eric Prydz", "Amelie Lens"],
  genres: ["techno", "melodic techno", "trance", "house"],
  suggestedArtists: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPLORE_CACHE_TTL_MS = 3 * 60 * 1000;
const QUERY_CACHE_TTL_MS = 60 * 1000;
const LOW_SIGNAL_TAGS = new Set([
  "internal",
  "trending",
  "general music match",
  "popular nearby",
  "19hz",
  "ticketmaster_artist",
  "ticketmaster_nearby",
  "ra",
]);
const GENRE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bmelodic techno\b/i, label: "Melodic Techno" },
  { pattern: /\bafro house\b/i, label: "Afro House" },
  { pattern: /\bdrum\s*(?:&|and)\s*bass\b|\bdnb\b/i, label: "Drum & Bass" },
  { pattern: /\bhard techno\b/i, label: "Hard Techno" },
  { pattern: /\btechno\b/i, label: "Techno" },
  { pattern: /\bhouse\b/i, label: "House" },
  { pattern: /\btrance\b/i, label: "Trance" },
  { pattern: /\bdisco\b/i, label: "Disco" },
  { pattern: /\bdubstep\b/i, label: "Dubstep" },
  { pattern: /\bbass\b/i, label: "Bass" },
  { pattern: /\bhip[- ]?hop\b/i, label: "Hip-Hop" },
  { pattern: /\blatin\b/i, label: "Latin" },
  { pattern: /\bjazz\b/i, label: "Jazz" },
  { pattern: /\brave\b/i, label: "Rave" },
];

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

function isQualityEventRow(row: InternalEventRow): boolean {
  const title = (row.title ?? "").trim();
  if (title.length < 4 || title.length > 140) return false;
  if (/^(tba|untitled|event|show)$/i.test(title)) return false;
  if (!row.event_date) return false;
  const startTs = new Date(row.event_date).getTime();
  if (Number.isNaN(startTs)) return false;
  return true;
}

function deriveGenreTags(row: InternalEventRow): string[] {
  const text = [row.title, row.description, row.location].filter(Boolean).join(" ");
  const tags: string[] = [];

  for (const { pattern, label } of GENRE_PATTERNS) {
    if (pattern.test(text)) tags.push(label);
    if (tags.length >= 3) break;
  }

  if (tags.length === 0 && (row.event_source ?? "").toLowerCase() === "19hz") {
    tags.push("Bay Area");
  }

  return tags;
}

function sanitizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .filter((tag) => !LOW_SIGNAL_TAGS.has(tag.toLowerCase()))
    )
  ).slice(0, 3);
}

const exploreCache = new Map<string, ExploreCacheEnvelope>();
const queryCache = new Map<string, AsyncCacheEnvelope<unknown>>();

function withQueryCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = queryCache.get(key) as AsyncCacheEnvelope<T> | undefined;
  if (cached && now - cached.savedAt <= QUERY_CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = loader().catch((error) => {
    queryCache.delete(key);
    throw error;
  });

  queryCache.set(key, {
    savedAt: now,
    promise,
  });

  return promise;
}

function getExploreCacheKey(kind: "trending" | "personalized", cityHint: string, taste?: TasteProfile) {
  const base = `${kind}:${normalize(cityHint) || "nearby"}`;
  if (!taste) return base;
  return `${base}:${normalize(taste.artists.join("|"))}:${normalize(taste.genres.join("|"))}:${normalize(
    taste.suggestedArtists.join("|")
  )}`;
}

function readExploreCache(key: string): Recommendation[] | null {
  const now = Date.now();
  const memoryHit = exploreCache.get(key);
  if (memoryHit && now - memoryHit.savedAt <= EXPLORE_CACHE_TTL_MS) {
    return memoryHit.data;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`whozin:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExploreCacheEnvelope;
    if (!parsed?.savedAt || !Array.isArray(parsed?.data)) return null;
    if (now - parsed.savedAt > EXPLORE_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(`whozin:${key}`);
      return null;
    }
    exploreCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

function writeExploreCache(key: string, data: Recommendation[]) {
  const envelope: ExploreCacheEnvelope = {
    savedAt: Date.now(),
    data,
  };
  exploreCache.set(key, envelope);

  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`whozin:${key}`, JSON.stringify(envelope));
  } catch {
    // Storage limits should never block event discovery.
  }
}

function dedupeEventRows(rows: InternalEventRow[]): InternalEventRow[] {
  const deduped = new Map<string, InternalEventRow>();

  for (const row of rows) {
    const titleKey = normalize(row.title);
    const locationKey = normalize(row.location);
    const dateKey = row.event_date ? row.event_date.slice(0, 16) : "no-date";
    const compositeKey = `${titleKey}|${locationKey}|${dateKey}`;
    const existing = deduped.get(compositeKey);
    if (!existing) {
      deduped.set(compositeKey, row);
      continue;
    }

    const existingScore = (existing.image_url ? 1 : 0) + (existing.ticket_url ? 1 : 0);
    const nextScore = (row.image_url ? 1 : 0) + (row.ticket_url ? 1 : 0);
    if (nextScore > existingScore) deduped.set(compositeKey, row);
  }

  return Array.from(deduped.values());
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

function sourcePriority(source: string | null | undefined): number {
  const normalized = normalize(source);
  if (!normalized || normalized === "internal") return 3;
  if (normalized === "19hz") return 2;
  if (normalized.startsWith("ticketmaster")) return 1;
  return 1;
}

function formatEventLocation(location: string | null | undefined, city: string | null | undefined): string {
  const cleanLocation = (location ?? "").trim();
  const cleanCity = (city ?? "").trim();

  if (cleanLocation && cleanCity) {
    const lowerLocation = cleanLocation.toLowerCase();
    const lowerCity = cleanCity.toLowerCase();
    if (lowerLocation.includes(lowerCity)) return cleanLocation;
    return `${cleanLocation}, ${cleanCity}`;
  }

  return cleanLocation || cleanCity || "Location TBD";
}

function rowMatchesCity(row: Pick<InternalEventRow, "city" | "location">, cityHint: string): boolean {
  const hint = cityHint.trim();
  if (!hint) return true;
  if (locationMatchesCity(row.city, hint)) return true;
  return locationMatchesCity(row.location, hint);
}

async function fetchUpcomingEventRows(limit: number, cityHint: string): Promise<InternalEventRow[]> {
  const cacheKey = `upcoming:${limit}:${normalize(cityHint) || "nearby"}`;
  return withQueryCache(cacheKey, async () => {
    const nowIso = new Date().toISOString();
    const selectClause =
      "id,title,location,city,event_date,event_end_date,image_url,description,event_source,moderation_status,ticket_url";

    const normalizedCity = cityHint.trim();
    if (normalizedCity) {
      const { data: cityRows, error: cityError } = await supabase
        .from("events")
        .select(selectClause)
        .ilike("city", `%${normalizedCity}%`)
        .or(`event_end_date.gte.${nowIso},and(event_end_date.is.null,event_date.gte.${nowIso})`)
        .order("event_date", { ascending: true })
        .limit(limit);

      if (cityError) throw cityError;
      if ((cityRows ?? []).length > 0) {
        return cityRows as InternalEventRow[];
      }
    }

    const { data, error } = await supabase
      .from("events")
      .select(selectClause)
      .or(`event_end_date.gte.${nowIso},and(event_end_date.is.null,event_date.gte.${nowIso})`)
      .order("event_date", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as InternalEventRow[];
  });
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

async function fetchInternalEvents(cityHint: string): Promise<InternalEventRow[]> {
  const cacheKey = `internal:${normalize(cityHint) || "nearby"}`;
  return withQueryCache(cacheKey, async () => {
    const rows = await fetchUpcomingEventRows(800, cityHint);

    const nowTs = Date.now();
    return dedupeEventRows(rows.filter((r) => {
      if (!isEventVisible(r)) return false;
      if (!isQualityEventRow(r)) return false;
      if (!rowMatchesCity(r, cityHint)) return false;
      const startTs = r.event_date ? new Date(r.event_date).getTime() : NaN;
      const endTs = r.event_end_date ? new Date(r.event_end_date).getTime() : startTs;
      if (Number.isNaN(startTs)) return true;
      if (Number.isNaN(endTs)) return startTs >= nowTs;
      return endTs >= nowTs;
    }));
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
  if (!canSurfaceSource("ticketmaster_artist")) return [];
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
    eventDateIso: row.event_date ?? undefined,
    eventEndDateIso: row.event_end_date ?? undefined,
    location: formatEventLocation(row.location, row.city),
    city: row.city ?? undefined,
    image: row.image_url ?? "",
    attendees: overrides?.attendees ?? 0,
    price: overrides?.price ?? "RSVP",
    description: overrides?.description ?? row.description ?? reason,
    tags: sanitizeTags([...(overrides?.tags ?? []), ...deriveGenreTags(row)]),
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

const BAY_AREA_CITIES = [
  "San Francisco",
  "Oakland",
  "Berkeley",
  "San Jose",
  "Santa Cruz",
  "Palo Alto",
  "Mountain View",
  "San Mateo",
  "Redwood City",
];

function matchesBayArea(row: Pick<InternalEventRow, "city" | "location">): boolean {
  return BAY_AREA_CITIES.some((city) => rowMatchesCity(row, city));
}

export async function loadFriendsFallbackExplore(): Promise<Recommendation[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) return [];

  const { data: friendIds, error: friendErr } = await supabase.rpc("get_friend_ids");
  if (friendErr) throw friendErr;

  const ids = Array.isArray(friendIds)
    ? friendIds.map((value) => String(value)).filter(Boolean)
    : [];
  if (ids.length === 0) return [];

  const pool = await fetchInternalEvents("");
  const internalEventIds = pool.map((row) => row.id).filter(isUuid);
  if (internalEventIds.length === 0) return [];

  const { data: attendeeRows, error: attendeesErr } = await supabase
    .from("attendees")
    .select("event_id,user_id,created_at")
    .in("event_id", internalEventIds)
    .in("user_id", ids);
  if (attendeesErr) throw attendeesErr;

  const byEvent = new Map<string, { friendCount: number; recentCount: number }>();
  const recentThreshold = Date.now() - 7 * DAY_MS;

  for (const row of (attendeeRows ?? []) as AttendeeRow[]) {
    const eventId = row.event_id;
    if (!eventId) continue;
    const current = byEvent.get(eventId) ?? { friendCount: 0, recentCount: 0 };
    current.friendCount += 1;
    const createdTs = row.created_at ? new Date(row.created_at).getTime() : NaN;
    if (!Number.isNaN(createdTs) && createdTs >= recentThreshold) {
      current.recentCount += 1;
    }
    byEvent.set(eventId, current);
  }

  return pool
    .map((row) => {
      const friendAgg = byEvent.get(row.id) ?? { friendCount: 0, recentCount: 0 };
      if (friendAgg.friendCount <= 0) return null;
      const date = dateProximityScore(row.event_date);
      const score = Number(
        Math.min(1, friendAgg.friendCount * 0.45 + friendAgg.recentCount * 0.2 + date * 0.35).toFixed(4)
      );
      const reason =
        friendAgg.friendCount >= 2
          ? `${friendAgg.friendCount} friends are already going`
          : "A friend is already going";

      return toUiEvent(row, score, reason, 3, {
        attendees: friendAgg.friendCount,
        tags: ["Your Friends Are Going"],
        description:
          row.description ??
          (friendAgg.recentCount > 0
            ? `${reason}. Momentum is building in your circle.`
            : `${reason}. Easy way to follow your people without locking a city yet.`),
      });
    })
    .filter((event): event is Recommendation => !!event)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.attendees ?? 0) - (a.attendees ?? 0);
    })
    .slice(0, 40);
}

export async function loadRegionalFallbackExplore(): Promise<Recommendation[]> {
  const pool = (await fetchInternalEvents("")).filter(matchesBayArea);

  return pool
    .map((row) => {
      const date = dateProximityScore(row.event_date);
      const sourceBoost = sourcePriority(row.event_source) / 3;
      const assetBoost = row.image_url ? 0.08 : 0;
      const ticketBoost = row.ticket_url ? 0.07 : 0;
      const score = Number(Math.min(1, date * 0.7 + sourceBoost * 0.15 + assetBoost + ticketBoost).toFixed(4));
      return toUiEvent(row, score, "Bay Area picks while we lock your city", 2, {
        description:
          row.description ?? "Showing a tighter Bay Area read until your city comes through.",
      });
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return sourcePriority(b.eventSource) - sourcePriority(a.eventSource);
    })
    .slice(0, 80);
}

export async function loadTrendingExplore(cityHint: string): Promise<Recommendation[]> {
  const cacheKey = getExploreCacheKey("trending", cityHint);
  const cached = readExploreCache(cacheKey);
  if (cached) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  const viewerId = sessionData.session?.user?.id ?? null;
  const nowTs = Date.now();
  const internalRows = await fetchUpcomingEventRows(800, cityHint);
  const upcoming = internalRows.filter((r) => {
    if (!isEventVisible(r)) return false;
    if (!isQualityEventRow(r)) return false;
    const startTs = r.event_date ? new Date(r.event_date).getTime() : NaN;
    const endTs = r.event_end_date ? new Date(r.event_end_date).getTime() : startTs;
    if (Number.isNaN(startTs)) return false;
    if (Number.isNaN(endTs)) return startTs >= nowTs;
    return endTs >= nowTs;
  });

  const cityScoped = upcoming.filter((r) => rowMatchesCity(r, cityHint));
  const pool = cityHint.trim().length > 0 ? cityScoped : upcoming;
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
    .filter((r) => {
      if (r.viewerGoing) return false;
      if (r.total < 2 && r.recent7 < 2) return false;
      return true;
    })
    .map(({ row, total, recent7 }) => {
      const date = dateProximityScore(row.event_date);
      const velocity = Math.min(1, recent7 / 8);
      const volume = Math.min(1, total / 25);
      const score = Number((velocity * 0.5 + volume * 0.35 + date * 0.15).toFixed(4));
      const reason =
        recent7 >= 2
          ? `Trending now (${recent7} new RSVPs)`
          : total >= 5
            ? "Crowd is already forming"
            : "Picking up tonight";
      return toUiEvent(row, score, reason, 2, {
        attendees: total,
        tags: recent7 >= 2 ? ["Building Fast"] : ["Crowd Pulling"],
        description:
          row.description ??
          `${total} people are going${recent7 > 0 ? `, with ${recent7} new RSVPs this week` : ""}.`,
      });
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.attendees ?? 0) - (a.attendees ?? 0);
    })
    .filter((event) => {
      const attendees = event.attendees ?? 0;
      return attendees >= 3 || event.score >= 0.28;
    })
    .slice(0, 6);

  writeExploreCache(cacheKey, ranked);
  return ranked;
}

export async function loadPersonalizedExplore(cityHint: string): Promise<Recommendation[]> {
  const taste = await getSpotifyTasteProfile();
  const cacheKey = getExploreCacheKey("personalized", cityHint, taste);
  const cached = readExploreCache(cacheKey);
  if (cached) return cached;

  const [internal, ticketmaster] = await Promise.all([
    fetchInternalEvents(cityHint),
    fetchTicketmasterEvents(cityHint, taste),
  ]);

  const combined = dedupeEventRows([...internal, ...ticketmaster]);

  const ranked = combined
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
      const aSourcePriority = sourcePriority(a.eventSource);
      const bSourcePriority = sourcePriority(b.eventSource);
      if (aSourcePriority !== bSourcePriority) return bSourcePriority - aSourcePriority;
      const aValid = isUuid(a.id) ? 1 : 0;
      const bValid = isUuid(b.id) ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;
      return b.score - a.score;
    })
    .slice(0, 120);

  writeExploreCache(cacheKey, ranked);
  return ranked;
}
