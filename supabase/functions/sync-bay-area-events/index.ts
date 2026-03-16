import { createClient } from "jsr:@supabase/supabase-js@2";

type NormalizedEvent = {
  title: string;
  source: string;
  sourceEventId: string;
  eventDateIso: string;
  eventEndDateIso: string | null;
  location: string | null;
  venueName: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  ticketUrl: string | null;
  externalUrl: string | null;
  description: string | null;
};

type JsonLdSource = {
  url: string;
  source: string;
  city?: string;
};

type RaFetchDebug = {
  listing_pages: number;
  discovered_event_urls: number;
  deduped_event_urls: number;
  detail_fetch_success: number;
  detail_fetch_failed: number;
  parsed_events: number;
  filtered_out: number;
};

type SourceRun<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type SourceStat = {
  source: string;
  fetched: number;
  upserted: number;
  inserted: number;
  updated: number;
  status: "succeeded" | "failed";
  error: string | null;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_ALLOWED_EMAILS = ["hello@whozin.app", "jvincenthallahan@gmail.com"];
const DEFAULT_RA_URLS = [
  "https://ra.co/events/us/sanfrancisco",
  "https://ra.co/events/us/oakland",
];
const DEFAULT_19HZ_URL = "https://19hz.info/eventlisting_BayArea.php";
const DEFAULT_JSON_LD_SOURCES: JsonLdSource[] = [
  {
    url: "https://shotgun.live/en/venues/boof",
    source: "shotgun_boof",
    city: "San Francisco",
  },
  {
    url: "https://shotgun.live/en/venues/le-club-society",
    source: "shotgun_le_club",
    city: "San Francisco",
  },
  {
    url: "https://shotgun.live/en/venues/hard-reset-presents",
    source: "shotgun_hard_reset",
    city: "San Francisco",
  },
  {
    url: "https://shotgun.live/en/venues/queen-out",
    source: "shotgun_queen_out",
    city: "San Francisco",
  },
];
const DEFAULT_BAY_AREA_CITIES = [
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
const BAY_AREA_CITY_HINTS = [
  "san francisco",
  "oakland",
  "berkeley",
  "san jose",
  "santa cruz",
  "palo alto",
  "mountain view",
  "san mateo",
  "redwood city",
  "marin",
  "walnut creek",
  "alameda",
  "menlo park",
  "emeryville",
  "daly city",
  "hayward",
];
const LOW_SIGNAL_19HZ_TITLE_PATTERNS = [
  /\btba\b/i,
  /\buntitled\b/i,
  /\bcoming soon\b/i,
  /\bto be announced\b/i,
  /\bpresale\b/i,
  /\bguest list\b/i,
  /\btable reservations?\b/i,
  /\bopen decks?\b/i,
  /\bfree entry\b/i,
  /\bguest list only\b/i,
  /\binfo coming soon\b/i,
];
const LOW_SIGNAL_19HZ_ORGANIZER_PATTERNS = [
  /\btest\b/i,
  /\bplaceholder\b/i,
];
const TRUSTED_TICKET_HOSTS = [
  "eventbrite.com",
  "dice.fm",
  "shotgun.live",
  "ra.co",
  "posh.vip",
  "seetickets.us",
  "tixr.com",
  "ticketweb.com",
  "axs.com",
  "dice.fm",
];
const DEFAULT_19HZ_ENRICH_LIMIT = 120;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const parsed = asString(value);
    if (parsed) return parsed;
  }
  return null;
}

function parseDate(value: unknown): string | null {
  const s = asString(value);
  if (!s) return null;
  const ts = new Date(s).getTime();
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function looksBayArea(text: string | null | undefined): boolean {
  const lower = (text ?? "").trim().toLowerCase();
  if (!lower) return false;
  return BAY_AREA_CITY_HINTS.some((hint) => lower.includes(hint));
}

function parseCityList(raw: string | null): string[] {
  if (!raw) return DEFAULT_BAY_AREA_CITIES;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJsonArray<T>(raw: string | null, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function mergeJsonLdSources(primary: JsonLdSource[], fallback: JsonLdSource[]): JsonLdSource[] {
  const merged = new Map<string, JsonLdSource>();
  for (const entry of [...fallback, ...primary]) {
    const url = asString(entry?.url);
    const source = asString(entry?.source);
    if (!url || !source) continue;
    merged.set(url.toLowerCase(), {
      url,
      source,
      city: asString(entry?.city) ?? undefined,
    });
  }
  return Array.from(merged.values());
}

function normalizeForKey(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeUrl(value: string | null | undefined): string | null {
  const parsed = asString(value);
  if (!parsed) return null;
  try {
    const url = new URL(parsed);
    url.hash = "";
    if (url.hostname.includes("eventbrite.")) {
      for (const key of ["aff", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return parsed;
  }
}

function urlHost(value: string | null | undefined): string | null {
  const parsed = canonicalizeUrl(value);
  if (!parsed) return null;
  try {
    return new URL(parsed).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function hasTrustedTicketHost(value: string | null | undefined): boolean {
  const host = urlHost(value);
  return !!host && TRUSTED_TICKET_HOSTS.some((trusted) => host === trusted || host.endsWith(`.${trusted}`));
}

function isValidFutureDate(value: string | null | undefined): boolean {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const ts = new Date(parsed).getTime();
  if (Number.isNaN(ts)) return false;
  const tooOld = Date.now() - 12 * 60 * 60 * 1000;
  const tooFar = Date.now() + 180 * 24 * 60 * 60 * 1000;
  return ts >= tooOld && ts <= tooFar;
}

function eventQualityScore(event: NormalizedEvent): number {
  let score = 0;
  if (event.imageUrl) score += 3;
  if (hasTrustedTicketHost(event.ticketUrl)) score += 4;
  else if (event.ticketUrl) score += 2;
  if (event.externalUrl) score += 1;
  if (event.venueName) score += 2;
  if (event.city) score += 1;
  if (event.description && event.description.length >= 40) score += 1;
  if (event.source === "internal") score += 3;
  if (event.source === "ra") score += 2;
  if (event.source === "19hz") score += 1;
  return score;
}

function chooseBetterEvent(current: NormalizedEvent, candidate: NormalizedEvent): NormalizedEvent {
  const currentScore = eventQualityScore(current);
  const candidateScore = eventQualityScore(candidate);
  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  const currentTitleLength = current.title.length;
  const candidateTitleLength = candidate.title.length;
  if (candidateTitleLength !== currentTitleLength) {
    return candidateTitleLength > currentTitleLength ? candidate : current;
  }

  return candidate.source.localeCompare(current.source) < 0 ? candidate : current;
}

function buildSemanticDedupeKey(event: NormalizedEvent): string {
  const start = parseDate(event.eventDateIso);
  const dateKey = start ? start.slice(0, 16) : "no-date";
  const titleKey = normalizeForKey(event.title);
  const venueKey = normalizeForKey(event.venueName ?? event.location ?? event.city);
  return `${titleKey}|${venueKey}|${dateKey}`;
}

async function runSource<T>(label: string, loader: () => Promise<T>): Promise<SourceRun<T>> {
  try {
    return { ok: true, data: await loader() };
  } catch (error) {
    const message = errorToMessage(error);
    return { ok: false, error: `${label}: ${message}` };
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WhozinBot/1.0; +https://whozin.app)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${url}`);
  }
  return await res.text();
}

function stripTags(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractHtmlMatch(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : null;
}

function extractHtmlAttr(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ? normalizeWhitespace(match[1]) : null;
}

function inferRaCityFromUrl(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.includes("/sanfrancisco")) return "San Francisco";
  if (lower.includes("/oakland")) return "Oakland";
  return undefined;
}

function extractRaEventUrls(listingHtml: string): string[] {
  const matches = listingHtml.matchAll(/href=["'](\/events\/\d+[^"']*)["']/gi);
  const urls = new Set<string>();
  for (const match of matches) {
    const href = canonicalizeUrl(`https://ra.co${match[1] ?? ""}`);
    if (!href) continue;
    urls.add(href);
  }
  return Array.from(urls).slice(0, 80);
}

function monthFromLabel(value: string): number | null {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = months.indexOf(value.trim().slice(0, 3).toLowerCase());
  return idx >= 0 ? idx : null;
}

function parseRaDateTime(dateLabel: string | null, timeRangeLabel: string | null): { start: string | null; end: string | null } {
  if (!dateLabel || !timeRangeLabel) return { start: null, end: null };
  const dateMatch = dateLabel.match(/[A-Za-z]{3},\s+([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/i);
  const timeMatch = timeRangeLabel.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return { start: null, end: null };

  const month = monthFromLabel(dateMatch[1]);
  const day = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  if (month === null || !Number.isFinite(day) || !Number.isFinite(year)) {
    return { start: null, end: null };
  }

  const startHour = Number(timeMatch[1]);
  const startMinute = Number(timeMatch[2]);
  const endHour = Number(timeMatch[3]);
  const endMinute = Number(timeMatch[4]);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
    return { start: null, end: null };
  }

  const start = new Date(Date.UTC(year, month, day, startHour, startMinute, 0));
  const end = new Date(Date.UTC(year, month, day, endHour, endMinute, 0));
  if (end.getTime() <= start.getTime()) {
    end.setUTCDate(end.getUTCDate() + 1);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function parseResidentAdvisorEventPage(
  eventUrl: string,
  html: string,
  fallbackCity?: string
): Promise<NormalizedEvent | null> {
  for (const block of extractJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const nodes: Array<Record<string, unknown>> = [];
      collectJsonLdEvents(parsed, nodes);
      for (const node of nodes) {
        const normalized = await normalizeJsonLdEvent(node, "ra", fallbackCity);
        if (!normalized) continue;
        normalized.externalUrl = eventUrl;
        normalized.ticketUrl = normalized.ticketUrl ?? eventUrl;
        return normalized;
      }
    } catch {
      // Ignore malformed blocks and fall back to visible HTML parsing.
    }
  }

  const title =
    extractHtmlMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ??
    extractHtmlMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+at\s+.*$/, "").trim() ??
    null;
  const venue =
    extractHtmlMatch(html, /Venue<\/[^>]+>\s*([\s\S]*?)(?:<[^>]+>\s*Date|<\/section>|<\/div>)/i) ??
    extractHtmlMatch(html, /Location<\/[^>]+>\s*([\s\S]*?)(?:<[^>]+>\s*Calendar|<\/section>|<\/div>)/i);
  const dateLabel = extractHtmlMatch(html, /Date<\/[^>]+>\s*([\s\S]*?)(?:<[^>]+>\s*\d{1,2}:\d{2}|<\/section>|<\/div>)/i);
  const timeRangeLabel = extractHtmlMatch(html, /([0-9]{1,2}:[0-9]{2}\s*(?:&nbsp;| )*[-–]\s*(?:&nbsp;| )*[0-9]{1,2}:[0-9]{2})/i);
  const description =
    extractHtmlMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const imageUrl =
    extractHtmlMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlMatch(html, /<img[^>]+src=["']([^"']+)["'][^>]*alt=["'][^"']*Flyer[^"']*["']/i);
  const { start, end } = parseRaDateTime(dateLabel, timeRangeLabel);
  if (!title || !start) return null;

  const city = fallbackCity ?? (venue && looksBayArea(venue) ? DEFAULT_BAY_AREA_CITIES.find((entry) => venue.toLowerCase().includes(entry.toLowerCase())) ?? null : null);
  const sourceEventId = firstString(eventUrl.match(/\/events\/(\d+)/)?.[1]) ?? await sha1(`${title}|${start}|${venue ?? ""}`);

  return {
    title,
    source: "ra",
    sourceEventId,
    eventDateIso: start,
    eventEndDateIso: end,
    location: venue,
    venueName: venue,
    city: city ?? null,
    lat: null,
    lng: null,
    imageUrl: canonicalizeUrl(imageUrl),
    ticketUrl: eventUrl,
    externalUrl: eventUrl,
    description,
  };
}

function extractShotgunEventUrls(listingHtml: string): string[] {
  const matches = listingHtml.matchAll(/href=["'](\/en\/events\/[^"'/?#]+)["']/gi);
  const urls = new Set<string>();
  for (const match of matches) {
    const href = canonicalizeUrl(`https://shotgun.live${match[1] ?? ""}`);
    if (!href) continue;
    urls.add(href);
  }
  return Array.from(urls).slice(0, 60);
}

function inferShotgunYear(month: number, day: number): number {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), month, day, 0, 0, 0));
  if (candidate.getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000) {
    return now.getUTCFullYear() + 1;
  }
  return now.getUTCFullYear();
}

function parseShotgunDateRange(label: string | null): { start: string | null; end: string | null } {
  if (!label) return { start: null, end: null };
  const match = label.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3})\s+from\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  if (!match) return { start: null, end: null };
  const day = Number(match[1]);
  const month = monthFromLabel(match[2]);
  if (month === null || !Number.isFinite(day)) return { start: null, end: null };
  const year = inferShotgunYear(month, day);
  let startHour = Number(match[3]);
  const startMinute = Number(match[4]);
  const startMeridiem = match[5].toUpperCase();
  let endHour = Number(match[6]);
  const endMinute = Number(match[7]);
  const endMeridiem = match[8].toUpperCase();
  if (startMeridiem === "PM" && startHour !== 12) startHour += 12;
  if (startMeridiem === "AM" && startHour === 12) startHour = 0;
  if (endMeridiem === "PM" && endHour !== 12) endHour += 12;
  if (endMeridiem === "AM" && endHour === 12) endHour = 0;
  const start = new Date(Date.UTC(year, month, day, startHour, startMinute, 0));
  const end = new Date(Date.UTC(year, month, day, endHour, endMinute, 0));
  if (end.getTime() <= start.getTime()) {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

async function parseShotgunEventPage(
  eventUrl: string,
  html: string,
  fallbackCity?: string
): Promise<NormalizedEvent | null> {
  const title = extractHtmlMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const dateLine = extractHtmlMatch(html, /<h1[^>]*>[\s\S]*?<\/h1>\s*([\s\S]*?)\s*(?:<[^>]+>\s*Interested|<[^>]+>\s*\d+\s+are interested)/i);
  const location =
    extractHtmlMatch(html, /(?:AM|PM)\s*(.*?)\s*Interested/i) ??
    extractHtmlMatch(html, /##\s*Location\s*([\s\S]*?)\s*(?:##|<img|<div)/i);
  const description =
    extractHtmlMatch(html, /Description\s*([\s\S]*?)\s*Lineup/i) ??
    extractHtmlAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const imageUrl =
    extractHtmlAttr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<img[^>]+src=["']([^"']+)["'][^>]*Cover[^>]*>/i);
  const { start, end } = parseShotgunDateRange(dateLine);
  if (!title || !start) return null;

  const sourceEventId = firstString(eventUrl.match(/\/events\/([^/?#]+)/)?.[1]) ?? await sha1(`${title}|${start}|${location ?? ""}`);
  const city =
    fallbackCity ??
    (location && looksBayArea(location)
      ? DEFAULT_BAY_AREA_CITIES.find((entry) => location.toLowerCase().includes(entry.toLowerCase())) ?? null
      : null);

  return {
    title,
    source: "shotgun",
    sourceEventId,
    eventDateIso: start,
    eventEndDateIso: end,
    location,
    venueName: location,
    city: city ?? null,
    lat: null,
    lng: null,
    imageUrl: canonicalizeUrl(imageUrl),
    ticketUrl: eventUrl,
    externalUrl: eventUrl,
    description,
  };
}

async function fetchShotgunSources(configs: JsonLdSource[]): Promise<NormalizedEvent[]> {
  const listingPages = await Promise.all(
    configs.map(async (config) => ({
      config,
      html: await fetchHtml(config.url),
    }))
  );

  const targets = listingPages.flatMap((page) =>
    extractShotgunEventUrls(page.html).map((eventUrl) => ({
      eventUrl,
      city: page.config.city,
    }))
  );

  const dedupedTargets = Array.from(new Map(targets.map((entry) => [entry.eventUrl, entry])).values()).slice(0, 80);
  const parsed = await Promise.all(
    dedupedTargets.map(async (target) => {
      try {
        const html = await fetchHtml(target.eventUrl);
        const normalized = await parseShotgunEventPage(target.eventUrl, html, target.city);
        if (!normalized) return null;
        const haystack = [normalized.city, normalized.location, normalized.venueName].filter(Boolean).join(" ");
        if (!looksBayArea(haystack)) return null;
        if (!isValidFutureDate(normalized.eventDateIso)) return null;
        return normalized;
      } catch {
        return null;
      }
    })
  );

  return parsed.filter((value): value is NormalizedEvent => !!value);
}

async function fetchResidentAdvisor(startUrls: string[]): Promise<{ events: NormalizedEvent[]; debug: RaFetchDebug }> {
  const listingPages = await Promise.all(
    startUrls.map(async (url) => ({
      url,
      city: inferRaCityFromUrl(url),
      html: await fetchHtml(url),
    }))
  );

  const eventTargets = listingPages.flatMap((page) =>
    extractRaEventUrls(page.html).map((eventUrl) => ({
      eventUrl,
      city: page.city,
    }))
  );

  const dedupedTargets = Array.from(
    new Map(eventTargets.map((entry) => [entry.eventUrl, entry])).values()
  ).slice(0, 60);

  let detailFetchSuccess = 0;
  let detailFetchFailed = 0;
  let parsedEvents = 0;
  let filteredOut = 0;
  const results = await Promise.all(
    dedupedTargets.map(async (target) => {
      try {
        const html = await fetchHtml(target.eventUrl);
        detailFetchSuccess += 1;
        const normalized = await parseResidentAdvisorEventPage(target.eventUrl, html, target.city);
        if (!normalized) {
          filteredOut += 1;
          return null;
        }
        const haystack = [normalized.city, normalized.location, normalized.venueName].filter(Boolean).join(" ");
        if (!looksBayArea(haystack)) {
          filteredOut += 1;
          return null;
        }
        if (!isValidFutureDate(normalized.eventDateIso)) {
          filteredOut += 1;
          return null;
        }
        parsedEvents += 1;
        return normalized;
      } catch {
        detailFetchFailed += 1;
        return null;
      }
    })
  );

  return {
    events: results.filter((value): value is NormalizedEvent => !!value),
    debug: {
      listing_pages: listingPages.length,
      discovered_event_urls: eventTargets.length,
      deduped_event_urls: dedupedTargets.length,
      detail_fetch_success: detailFetchSuccess,
      detail_fetch_failed: detailFetchFailed,
      parsed_events: parsedEvents,
      filtered_out: filteredOut,
    },
  };
}

async function fetchTicketmaster(apiKey: string | null, cities: string[]): Promise<NormalizedEvent[]> {
  if (!apiKey) return [];

  const now = new Date();
  const startDateTime = now.toISOString();
  const endDateTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.all(
    cities.map(async (city) => {
      const params = new URLSearchParams({
        apikey: apiKey,
        city,
        classificationName: "music",
        size: "50",
        sort: "date,asc",
        startDateTime,
        endDateTime,
      });
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const payload = await res.json();
      return Array.isArray(payload?._embedded?.events) ? payload._embedded.events as Array<Record<string, unknown>> : [];
    })
  );

  const output: NormalizedEvent[] = [];
  for (const cityEvents of results) {
    for (const item of cityEvents) {
      const title = firstString(item.name);
      const sourceEventId = firstString(item.id);
      const start = parseDate((item.dates as Record<string, unknown> | undefined)?.start
        ? ((item.dates as Record<string, unknown>).start as Record<string, unknown>).dateTime
        : null);
      if (!title || !sourceEventId || !start) continue;

      const embedded = (item._embedded as Record<string, unknown> | undefined) ?? {};
      const venues = Array.isArray(embedded.venues) ? embedded.venues as Array<Record<string, unknown>> : [];
      const attractions = Array.isArray(embedded.attractions)
        ? embedded.attractions as Array<Record<string, unknown>>
        : [];
      const venue = venues[0] ?? {};
      const city = firstString(
        (venue.city as Record<string, unknown> | undefined)?.name,
        venue.name
      );
      const venueName = firstString(venue.name);
      const location = [venueName, firstString((venue.city as Record<string, unknown> | undefined)?.name)]
        .filter(Boolean)
        .join(", ");
      const imageUrl = Array.isArray(item.images)
        ? firstString(...(item.images as Array<Record<string, unknown>>).map((img) => img.url))
        : null;
      const performerText = attractions
        .map((entry) => firstString(entry.name))
        .filter(Boolean)
        .join(", ");
      const description = performerText
        ? `Ticketmaster listing. Featuring: ${performerText}`
        : "Ticketmaster listing.";

      output.push({
        title,
        source: "ticketmaster",
        sourceEventId,
        eventDateIso: start,
        eventEndDateIso: null,
        location: location || venueName,
        venueName,
        city,
        lat: parseNumber(venue.location && typeof venue.location === "object" ? (venue.location as Record<string, unknown>).latitude : null),
        lng: parseNumber(venue.location && typeof venue.location === "object" ? (venue.location as Record<string, unknown>).longitude : null),
        imageUrl,
        ticketUrl: firstString(item.url),
        externalUrl: firstString(item.url),
        description,
      });
    }
  }

  return output;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeWhitespace(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function cleanCellText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function monthIndex(mon: string): number | null {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = months.indexOf(mon.toLowerCase().slice(0, 3));
  return idx >= 0 ? idx : null;
}

function inferYearForMonth(month: number): number {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  return month + 2 < currentMonth ? currentYear + 1 : currentYear;
}

function parse19hzDateTime(dateText: string, timeText: string): string | null {
  const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*([A-Za-z]{3})\s+(\d{1,2})/i);
  if (!dateMatch) return null;
  const month = monthIndex(dateMatch[1]);
  if (month === null) return null;
  const day = Number(dateMatch[2]);
  if (!Number.isFinite(day)) return null;

  const timeMatch = timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!timeMatch) return null;
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? "0");
  const meridiem = timeMatch[3].toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const year = inferYearForMonth(month);
  const dt = new Date(Date.UTC(year, month, day, hour, minute, 0));
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

function splitVenueAndCity(raw: string): { venueName: string | null; city: string | null; location: string | null } {
  const match = raw.match(/^(.*?)\s*@\s*(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) {
    return {
      venueName: null,
      city: looksBayArea(raw) ? DEFAULT_BAY_AREA_CITIES.find((city) => raw.toLowerCase().includes(city.toLowerCase())) ?? null : null,
      location: raw || null,
    };
  }

  const venueName = normalizeWhitespace(match[2]);
  const city = normalizeWhitespace(match[3]);
  return {
    venueName: venueName || null,
    city: city || null,
    location: [venueName, city].filter(Boolean).join(", ") || null,
  };
}

function clean19hzTitle(raw: string): string {
  return normalizeWhitespace(
    raw
      .replace(/\s+\[[^\]]+\]\s*$/g, "")
      .replace(/\s+\([^)]*sold out[^)]*\)\s*$/gi, "")
      .replace(/\s+\|\s+buy tickets?$/gi, "")
      .replace(/\s+-\s+buy tickets?$/gi, "")
  );
}

function uppercaseRatio(value: string): number {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (!letters) return 0;
  const uppercaseLetters = letters.replace(/[^A-Z]/g, "");
  return uppercaseLetters.length / letters.length;
}

function isLowSignal19hzEvent(
  title: string,
  venueCity: { venueName: string | null; city: string | null; location: string | null },
  organizers: string,
  startIso: string | null
): boolean {
  if (!title || title.length < 4 || title.length > 140) return true;
  if (LOW_SIGNAL_19HZ_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return true;
  if (LOW_SIGNAL_19HZ_ORGANIZER_PATTERNS.some((pattern) => pattern.test(organizers))) return true;
  if (uppercaseRatio(title) > 0.82 && title.length > 18) return true;
  if (!venueCity.venueName && !venueCity.location) return true;
  if (!isValidFutureDate(startIso)) return true;
  return false;
}

function pickPreferred19hzUrl(links: string[]): string | null {
  const normalized = links
    .map((link) => canonicalizeUrl(link))
    .filter((link): link is string => !!link);
  if (normalized.length === 0) return null;
  return (
    normalized.find((link) => hasTrustedTicketHost(link)) ??
    normalized.find((link) => !/facebook\.com|instagram\.com/i.test(link)) ??
    normalized[0]
  );
}

function extract19hzPrimaryCellParts(raw: string): { titleVenueText: string; inlineTags: string } {
  const source = raw ?? "";
  const [titlePart, ...rest] = source.split(/<td[^>]*>/i);
  return {
    titleVenueText: cleanCellText(titlePart ?? ""),
    inlineTags: cleanCellText(rest.join(" ")),
  };
}

function extract19hzRowLinks(rowHtml: string): string[] {
  return Array.from((rowHtml ?? "").matchAll(/href=['"]([^'"]+)['"]/gi))
    .map((match) => normalizeWhitespace(match[1] ?? ""))
    .filter(Boolean);
}

type RemotePageMetadata = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  canonicalUrl: string | null;
};

async function fetchRemotePageMetadata(url: string): Promise<RemotePageMetadata> {
  const html = await fetchHtml(url);
  const title =
    extractHtmlAttr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    extractHtmlAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);
  const imageUrl =
    canonicalizeUrl(
      extractHtmlAttr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      extractHtmlAttr(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    );
  const canonicalUrl = canonicalizeUrl(
    extractHtmlAttr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i) ??
    url
  );

  return {
    title,
    description,
    imageUrl,
    canonicalUrl,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const output = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return output;
}

async function enrich19hzEvents(events: NormalizedEvent[]): Promise<NormalizedEvent[]> {
  const enrichLimitRaw = parseNumber(Deno.env.get("HZ19_ENRICH_LIMIT"));
  const enrichLimit =
    enrichLimitRaw && enrichLimitRaw > 0
      ? Math.min(Math.floor(enrichLimitRaw), events.length)
      : Math.min(DEFAULT_19HZ_ENRICH_LIMIT, events.length);

  const prioritized = [...events]
    .filter((event) => !event.imageUrl)
    .sort((a, b) => a.eventDateIso.localeCompare(b.eventDateIso))
    .slice(0, enrichLimit);

  const metadataByUrl = new Map<string, Promise<RemotePageMetadata | null>>();

  await mapWithConcurrency(prioritized, 8, async (event) => {
    const candidateUrl = canonicalizeUrl(event.ticketUrl ?? event.externalUrl);
    if (!candidateUrl || !hasTrustedTicketHost(candidateUrl)) return null;
    if (!metadataByUrl.has(candidateUrl)) {
      metadataByUrl.set(
        candidateUrl,
        fetchRemotePageMetadata(candidateUrl).catch(() => null)
      );
    }
    const metadata = await metadataByUrl.get(candidateUrl)!;
    if (!metadata) return null;
    if (metadata.imageUrl) {
      event.imageUrl = metadata.imageUrl;
    }
    if (!event.description && metadata.description) {
      event.description = metadata.description;
    }
    if (!event.externalUrl || event.externalUrl === DEFAULT_19HZ_URL) {
      event.externalUrl = metadata.canonicalUrl ?? candidateUrl;
    }
    if (event.ticketUrl && !hasTrustedTicketHost(event.ticketUrl) && hasTrustedTicketHost(candidateUrl)) {
      event.ticketUrl = candidateUrl;
    }
    return null;
  });

  return events;
}

async function normalize19hzRow(cells: string[], rowHtml: string, pageUrl: string): Promise<NormalizedEvent | null> {
  if (cells.length < 2) return null;
  const dateTimeText = cells[0]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const dateLines = dateTimeText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  if (dateLines.length < 2) return null;

  const dateText = dateLines[0];
  const timeText = dateLines[1].replace(/^\(|\)$/g, "");
  const primaryCell = extract19hzPrimaryCellParts(cells[1] ?? "");
  const titleVenueText = primaryCell.titleVenueText;
  if (!dateText || !timeText || !titleVenueText) return null;
  if (/^date\/time$/i.test(dateText) || /^event title/i.test(titleVenueText)) return null;

  const start = parse19hzDateTime(dateText, timeText);
  if (!start) return null;

  const titleSplit = titleVenueText.split(/\s+@\s+/);
  const title = clean19hzTitle(titleSplit[0] ?? "");
  if (!title) return null;

  const venueCity = splitVenueAndCity(titleVenueText);
  const tags = primaryCell.inlineTags || (cells[2] ? cleanCellText(cells[2]) : "");
  const priceAge = cells[3] ? cleanCellText(cells[3]) : "";
  const organizers = cells[4] ? cleanCellText(cells[4]) : "";
  const links = extract19hzRowLinks(rowHtml);
  const primaryUrl = canonicalizeUrl(links[0] ?? pageUrl);
  const ticketUrl = pickPreferred19hzUrl(links);
  if (isLowSignal19hzEvent(title, venueCity, organizers, start)) return null;
  const description = [
    tags ? `Tags: ${tags}` : "",
    priceAge ? `Price/Age: ${priceAge}` : "",
    organizers ? `Organizers: ${organizers}` : "",
    "Imported from 19hz Bay Area listings.",
  ]
    .filter(Boolean)
    .join(" | ");

  const sourceEventId = await sha1(`19hz|${title}|${start}|${titleVenueText}`);

  return {
    title,
    source: "19hz",
    sourceEventId,
    eventDateIso: start,
    eventEndDateIso: null,
    location: venueCity.location,
    venueName: venueCity.venueName,
    city: venueCity.city,
    lat: null,
    lng: null,
    imageUrl: null,
    ticketUrl,
    externalUrl: primaryUrl ?? pageUrl,
    description,
  };
}

async function fetch19hz(url: string): Promise<NormalizedEvent[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`19hz fetch failed (${res.status})`);
  const html = await res.text();
  const rowMatches = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  const events: NormalizedEvent[] = [];

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1] ?? "";
    const cells = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1] ?? "");
    const normalized = await normalize19hzRow(cells, rowHtml, url);
    if (!normalized) continue;
    const haystack = [normalized.city, normalized.location, normalized.venueName].filter(Boolean).join(" ");
    if (!looksBayArea(haystack)) continue;
    events.push(normalized);
  }

  return await enrich19hzEvents(events);
}

function extractJsonLdBlocks(html: string): string[] {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  return Array.from(matches, (match) => match[1]).filter(Boolean);
}

function collectJsonLdEvents(node: unknown, acc: Array<Record<string, unknown>>) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const entry of node) collectJsonLdEvents(entry, acc);
    return;
  }
  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const typeRaw = obj["@type"];
  const typeList = Array.isArray(typeRaw) ? typeRaw : [typeRaw];
  const normalizedTypes = typeList.map((entry) => String(entry ?? "").toLowerCase());

  if (normalizedTypes.includes("event")) {
    acc.push(obj);
  }

  const itemList = obj.itemListElement;
  if (Array.isArray(itemList)) {
    for (const entry of itemList) {
      if (entry && typeof entry === "object" && "item" in (entry as Record<string, unknown>)) {
        collectJsonLdEvents((entry as Record<string, unknown>).item, acc);
      } else {
        collectJsonLdEvents(entry, acc);
      }
    }
  }

  if (obj["@graph"]) {
    collectJsonLdEvents(obj["@graph"], acc);
  }
}

async function normalizeJsonLdEvent(
  node: Record<string, unknown>,
  source: string,
  defaultCity?: string
): Promise<NormalizedEvent | null> {
  const title = firstString(node.name, node.headline);
  const start = parseDate(node.startDate);
  if (!title || !start) return null;

  const locationNode = node.location && typeof node.location === "object"
    ? node.location as Record<string, unknown>
    : null;
  const placeName = firstString(locationNode?.name);
  const addressNode = locationNode?.address && typeof locationNode.address === "object"
    ? locationNode.address as Record<string, unknown>
    : null;
  const addressText = firstString(
    addressNode?.streetAddress,
    addressNode?.addressLocality,
    addressNode?.addressRegion
  );
  const city = firstString(addressNode?.addressLocality, defaultCity);
  const location = [placeName, addressText, city].filter(Boolean).join(", ");
  const url = firstString(node.url, node["@id"]);
  const sourceEventId = firstString(node["@id"]) ?? (await sha1(`${source}|${title}|${start}|${url ?? ""}`));

  return {
    title,
    source,
    sourceEventId,
    eventDateIso: start,
    eventEndDateIso: parseDate(node.endDate),
    location: location || placeName,
    venueName: placeName,
    city,
    lat: parseNumber(locationNode?.geo && typeof locationNode.geo === "object" ? (locationNode.geo as Record<string, unknown>).latitude : null),
    lng: parseNumber(locationNode?.geo && typeof locationNode.geo === "object" ? (locationNode.geo as Record<string, unknown>).longitude : null),
    imageUrl: firstString(
      ...(Array.isArray(node.image) ? node.image : [node.image])
    ),
    ticketUrl: firstString(node.offers && typeof node.offers === "object" ? (node.offers as Record<string, unknown>).url : null, url),
    externalUrl: url,
    description: firstString(node.description),
  };
}

async function fetchJsonLdSources(configs: JsonLdSource[]): Promise<NormalizedEvent[]> {
  const output: NormalizedEvent[] = [];

  for (const config of configs) {
    if (!config?.url || !config?.source) continue;
    const res = await fetch(config.url);
    if (!res.ok) continue;
    const html = await res.text();
    const blocks = extractJsonLdBlocks(html);

    const eventNodes: Array<Record<string, unknown>> = [];
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        collectJsonLdEvents(parsed, eventNodes);
      } catch {
        // Ignore malformed structured data blocks.
      }
    }

    for (const node of eventNodes) {
      const normalized = await normalizeJsonLdEvent(node, config.source, config.city);
      if (!normalized) continue;
      const haystack = [normalized.city, normalized.location, normalized.venueName].filter(Boolean).join(" ");
      if (!looksBayArea(haystack)) continue;
      output.push(normalized);
    }
  }

  return output;
}

function dedupeEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  const bySourceKey = new Map<string, NormalizedEvent>();
  const bySemanticKey = new Map<string, NormalizedEvent>();
  for (const event of events) {
    const sourceKey = `${event.source}::${event.sourceEventId}`;
    const currentBySource = bySourceKey.get(sourceKey);
    const preferredSource = currentBySource ? chooseBetterEvent(currentBySource, event) : event;
    bySourceKey.set(sourceKey, preferredSource);
  }

  for (const event of bySourceKey.values()) {
    const semanticKey = buildSemanticDedupeKey(event);
    const current = bySemanticKey.get(semanticKey);
    bySemanticKey.set(semanticKey, current ? chooseBetterEvent(current, event) : event);
  }

  return Array.from(bySemanticKey.values());
}

async function upsertEvents(
  service: ReturnType<typeof createClient>,
  events: NormalizedEvent[]
): Promise<{ upserted: number; inserted: number; updated: number }> {
  if (events.length === 0) return { upserted: 0, inserted: 0, updated: 0 };

  const groupedKeys = new Map<string, string[]>();
  for (const event of events) {
    const arr = groupedKeys.get(event.source) ?? [];
    arr.push(event.sourceEventId);
    groupedKeys.set(event.source, arr);
  }

  const existingSet = new Set<string>();
  for (const [source, keys] of groupedKeys.entries()) {
    const readChunkSize = 75;
    for (let i = 0; i < keys.length; i += readChunkSize) {
      const chunk = keys.slice(i, i + readChunkSize);
      const { data, error } = await service
        .from("events")
        .select("event_source,source_event_id")
        .eq("event_source", source)
        .in("source_event_id", chunk);
      if (error) throw error;
      for (const row of data ?? []) {
        const typed = row as { event_source: string; source_event_id: string | null };
        if (typed.source_event_id) existingSet.add(`${typed.event_source}::${typed.source_event_id}`);
      }
    }
  }

  const rows = events.map((event) => ({
    title: event.title,
    event_date: event.eventDateIso,
    event_end_date: event.eventEndDateIso,
    location: event.location,
    venue_name: event.venueName,
    city: event.city,
    lat: event.lat,
    lng: event.lng,
    image_url: event.imageUrl,
    ticket_url: event.ticketUrl,
    external_url: event.externalUrl,
    description: event.description,
    event_source: event.source,
    source_event_id: event.sourceEventId,
  }));

  const chunkSize = 50;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await service.from("events").upsert(chunk, {
      onConflict: "event_source,source_event_id",
    });
    if (error) throw error;
    upserted += chunk.length;
  }

  const inserted = rows.filter((row) => !existingSet.has(`${row.event_source}::${row.source_event_id}`)).length;
  return {
    upserted,
    inserted,
    updated: Math.max(0, upserted - inserted),
  };
}

async function insertSyncRunSummary(
  service: ReturnType<typeof createClient>,
  payload: {
    syncName: string;
    startedAt: string;
    completedAt: string;
    timezone: string;
    status: string;
    totals: Record<string, unknown>;
    upsert: Record<string, unknown>;
    sourceErrors: string[];
    sourceStats: SourceStat[];
    sourceDebug: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await service.from("sync_run_summaries").insert({
    sync_name: payload.syncName,
    started_at: payload.startedAt,
    completed_at: payload.completedAt,
    timezone: payload.timezone,
    status: payload.status,
    totals: payload.totals,
    upsert: payload.upsert,
    source_errors: payload.sourceErrors,
    source_stats: payload.sourceStats,
    source_debug: payload.sourceDebug,
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase env" });
  }

  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const apikey = req.headers.get("apikey") ?? "";

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let isAuthorized = false;
  const bearerPayload = bearer ? decodeJwtPayload(bearer) : null;
  const apikeyPayload = apikey ? decodeJwtPayload(apikey) : null;
  const bearerRole = String(bearerPayload?.role ?? "").toLowerCase().trim();
  const apikeyRole = String(apikeyPayload?.role ?? "").toLowerCase().trim();

  if (bearer && bearer === serviceRoleKey) {
    isAuthorized = true;
  } else if (apikey && apikey === serviceRoleKey) {
    isAuthorized = true;
  } else if (bearerRole === "service_role" || bearerRole === "supabase_admin") {
    isAuthorized = true;
  } else if (apikeyRole === "service_role" || apikeyRole === "supabase_admin") {
    isAuthorized = true;
  } else if (bearer) {
    const allowedEmails = (Deno.env.get("ADMIN_EMAILS") ?? DEFAULT_ALLOWED_EMAILS.join(","))
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const jwtPayload = decodeJwtPayload(bearer);
    let email = String(jwtPayload?.email ?? "").toLowerCase().trim();
    if (!email) {
      const { data: userData, error: userErr } = await service.auth.getUser(bearer);
      if (!userErr && userData.user?.email) {
        email = userData.user.email.toLowerCase().trim();
      }
    }
    isAuthorized = allowedEmails.includes(email);
  }

  if (!isAuthorized) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  try {
    const runStartedAt = new Date().toISOString();
    const body = await req.json().catch(() => ({}));
    const raUrls = parseJsonArray<string>(Deno.env.get("APIFY_RA_URLS_JSON"), DEFAULT_RA_URLS);
    const hz19Url = Deno.env.get("BAY_AREA_19HZ_URL") ?? DEFAULT_19HZ_URL;
    const ticketmasterKey = Deno.env.get("TICKETMASTER_API_KEY") ??
      Deno.env.get("VITE_TICKETMASTER_API_KEY");
    const bayAreaCities = parseCityList(Deno.env.get("BAY_AREA_CITIES"));
    const configuredShotgunSources = parseJsonArray<JsonLdSource>(Deno.env.get("BAY_AREA_EVENT_URLS_JSON"), []);
    const shotgunSources = mergeJsonLdSources(configuredShotgunSources, DEFAULT_JSON_LD_SOURCES);
    const tz = typeof body?.tz === "string" && body.tz ? body.tz : "America/Chicago";

    const [raRun, hz19Run, ticketmasterRun, shotgunRun] = await Promise.all([
      runSource("ra", () => fetchResidentAdvisor(raUrls)),
      runSource("19hz", () => fetch19hz(hz19Url)),
      runSource("ticketmaster", () => fetchTicketmaster(ticketmasterKey, bayAreaCities)),
      runSource("shotgun", () => fetchShotgunSources(shotgunSources)),
    ]);

    const sourceErrors = [raRun, hz19Run, ticketmasterRun, shotgunRun]
      .filter((run): run is Extract<typeof run, { ok: false }> => !run.ok)
      .map((run) => run.error);

    const raEvents = raRun.ok ? raRun.data.events : [];
    const raDebug = raRun.ok ? raRun.data.debug : null;
    const hz19Events = hz19Run.ok ? hz19Run.data : [];
    const ticketmasterEvents = ticketmasterRun.ok ? ticketmasterRun.data : [];
    const shotgunEvents = shotgunRun.ok ? shotgunRun.data : [];

    const deduped = dedupeEvents([...raEvents, ...hz19Events, ...ticketmasterEvents, ...shotgunEvents]);
    const upsertSummary = await upsertEvents(service, deduped);
    const sourceStats: SourceStat[] = [
      {
        source: "ra",
        fetched: raEvents.length,
        upserted: deduped.filter((event) => event.source === "ra").length,
        inserted: 0,
        updated: 0,
        status: raRun.ok ? "succeeded" : "failed",
        error: raRun.ok ? null : raRun.error,
      },
      {
        source: "19hz",
        fetched: hz19Events.length,
        upserted: deduped.filter((event) => event.source === "19hz").length,
        inserted: 0,
        updated: 0,
        status: hz19Run.ok ? "succeeded" : "failed",
        error: hz19Run.ok ? null : hz19Run.error,
      },
      {
        source: "ticketmaster",
        fetched: ticketmasterEvents.length,
        upserted: deduped.filter((event) => event.source === "ticketmaster").length,
        inserted: 0,
        updated: 0,
        status: ticketmasterRun.ok ? "succeeded" : "failed",
        error: ticketmasterRun.ok ? null : ticketmasterRun.error,
      },
      {
        source: "shotgun",
        fetched: shotgunEvents.length,
        upserted: deduped.filter((event) => event.source === "shotgun").length,
        inserted: 0,
        updated: 0,
        status: shotgunRun.ok ? "succeeded" : "failed",
        error: shotgunRun.ok ? null : shotgunRun.error,
      },
    ];

    for (const stat of sourceStats) {
      const fetched = stat.fetched;
      const totalUpserted = stat.upserted;
      const insertedEstimate =
        fetched > 0 && upsertSummary.upserted > 0
          ? Math.round((totalUpserted / Math.max(deduped.length, 1)) * upsertSummary.inserted)
          : 0;
      stat.inserted = Math.min(totalUpserted, insertedEstimate);
      stat.updated = Math.max(0, totalUpserted - stat.inserted);
    }

    const { data: moveRefreshData, error: moveRefreshErr } = await service.rpc(
      "refresh_event_move_scores",
      { p_tz: tz }
    );
    if (moveRefreshErr) throw moveRefreshErr;

    const totals = {
      fetched: deduped.length,
      ra: raEvents.length,
      hz19: hz19Events.length,
      ticketmaster: ticketmasterEvents.length,
      shotgun: shotgunEvents.length,
    };
    const sourceDebug = {
      ra: raDebug,
    };
    const runCompletedAt = new Date().toISOString();
    await insertSyncRunSummary(service, {
      syncName: "sync-bay-area-events",
      startedAt: runStartedAt,
      completedAt: runCompletedAt,
      timezone: tz,
      status: "succeeded",
      totals,
      upsert: upsertSummary,
      sourceErrors,
      sourceStats,
      sourceDebug,
    });

    return jsonResponse(200, {
      ok: true,
      timezone: tz,
      totals,
      upsert: upsertSummary,
      move_refresh: moveRefreshData ?? null,
      sources: {
        ra_urls: raUrls,
        hz19_url: hz19Url,
        bay_area_cities: bayAreaCities,
        shotgun_sources: shotgunSources.map((entry) => entry.url),
      },
      source_debug: {
        ra: raDebug,
      },
      source_stats: sourceStats,
      source_errors: sourceErrors,
    });
  } catch (err) {
    return jsonResponse(500, {
      error: "Bay Area event sync failed",
      message: errorToMessage(err),
    });
  }
});
