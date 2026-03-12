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

type SourceRun<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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

function pickRaImageUrl(item: Record<string, unknown>): string | null {
  const direct = firstString(item.image, item.imageUrl, item.img, item.thumbnail);
  if (direct) return direct;

  const images = item.images;
  if (!Array.isArray(images)) return null;

  for (const image of images) {
    if (typeof image === "string") {
      const url = asString(image);
      if (url) return url;
    }
    if (image && typeof image === "object") {
      const url = asString((image as Record<string, unknown>).url);
      if (url) return url;
    }
  }

  return null;
}

function pickRaVenueName(item: Record<string, unknown>): string | null {
  const venue = item.venue;
  if (venue && typeof venue === "object") {
    const venueObj = venue as Record<string, unknown>;
    return firstString(venueObj.name, venueObj.title, venueObj.venueName);
  }
  return firstString(item.venueName, item.club, item.locationName, item.venue);
}

function pickRaCity(item: Record<string, unknown>, locationText: string | null): string | null {
  const city = firstString(item.city, item.town, item.area);
  if (city) return city;
  if (!locationText) return null;
  for (const hint of DEFAULT_BAY_AREA_CITIES) {
    if (locationText.toLowerCase().includes(hint.toLowerCase())) return hint;
  }
  return null;
}

function pickRaLatLng(item: Record<string, unknown>) {
  return {
    lat: parseNumber(item.lat ?? item.latitude),
    lng: parseNumber(item.lng ?? item.lon ?? item.longitude),
  };
}

async function normalizeRaItem(item: Record<string, unknown>): Promise<NormalizedEvent | null> {
  const title = firstString(item.title, item.name, item.eventTitle);
  if (!title) return null;

  const start =
    parseDate(item.startDateTime) ??
    parseDate(item.startDate) ??
    parseDate(item.dateTime) ??
    parseDate(item.startsAt) ??
    parseDate(item.date);
  if (!start) return null;

  const end = parseDate(item.endDateTime) ?? parseDate(item.endDate) ?? parseDate(item.endsAt);
  const venueName = pickRaVenueName(item);
  const location = firstString(item.location, item.address, item.areaName, venueName);
  const city = pickRaCity(item, location);
  const eventUrl = firstString(item.url, item.eventUrl, item.link);
  const ticketUrl = firstString(item.ticketUrl, item.ticketsUrl, item.ticket_link, eventUrl);
  const sourceEventId =
    firstString(item.id, item.eventId, item.raId) ?? (await sha1(`${title}|${start}|${venueName ?? ""}`));
  const { lat, lng } = pickRaLatLng(item);

  return {
    title,
    source: "ra",
    sourceEventId,
    eventDateIso: start,
    eventEndDateIso: end,
    location,
    venueName,
    city,
    lat,
    lng,
    imageUrl: pickRaImageUrl(item),
    ticketUrl,
    externalUrl: eventUrl,
    description: firstString(item.description, item.summary, item.content),
  };
}

function buildApifyUrl(actorId: string, token: string): string {
  const params = new URLSearchParams({
    token,
    format: "json",
  });
  return `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?${params.toString()}`;
}

function buildRaApifyInput(startUrls: string[]) {
  const now = new Date();
  const plus30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    startUrls: startUrls.map((url) => ({ url })),
    dateRangeFrom: now.toISOString().slice(0, 10),
    dateRangeTo: plus30.toISOString().slice(0, 10),
    maxItems: 120,
    enforceMaxItems: true,
    maxErrors: 0,
    downloadDelay: 1000,
  };
}

async function fetchResidentAdvisor(
  apifyToken: string | null,
  actorId: string,
  startUrls: string[]
): Promise<NormalizedEvent[]> {
  if (!apifyToken) return [];

  const res = await fetch(buildApifyUrl(actorId, apifyToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRaApifyInput(startUrls)),
  });
  if (!res.ok) {
    throw new Error(`Resident Advisor sync failed (${res.status})`);
  }

  const payload = await res.json();
  if (!Array.isArray(payload)) {
    throw new Error("Resident Advisor payload was not an array");
  }

  const output: NormalizedEvent[] = [];
  for (const raw of payload) {
    if (!raw || typeof raw !== "object") continue;
    const normalized = await normalizeRaItem(raw as Record<string, unknown>);
    if (!normalized) continue;
    if (
      normalized.city && !looksBayArea(normalized.city) &&
      normalized.location && !looksBayArea(normalized.location)
    ) {
      continue;
    }
    output.push(normalized);
  }

  return output;
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

async function normalize19hzRow(cells: string[], pageUrl: string): Promise<NormalizedEvent | null> {
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
  const titleVenueText = cleanCellText(cells[1]);
  if (!dateText || !timeText || !titleVenueText) return null;
  if (/^date\/time$/i.test(dateText) || /^event title/i.test(titleVenueText)) return null;

  const start = parse19hzDateTime(dateText, timeText);
  if (!start) return null;

  const titleSplit = titleVenueText.split(/\s+@\s+/);
  const title = clean19hzTitle(titleSplit[0] ?? "");
  if (!title) return null;

  const venueCity = splitVenueAndCity(titleVenueText);
  const tags = cells[2] ? cleanCellText(cells[2]) : "";
  const priceAge = cells[3] ? cleanCellText(cells[3]) : "";
  const organizers = cells[4] ? cleanCellText(cells[4]) : "";
  const linkMatches = Array.from((cells[5] ?? "").matchAll(/href=['"]([^'"]+)['"]/gi));
  const links = linkMatches
    .map((match) => normalizeWhitespace(match[1] ?? ""))
    .filter(Boolean);
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

  const sourceEventId = await sha1(`19hz|${title}|${start}|${venueCity.venueName ?? ""}|${venueCity.city ?? ""}`);

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
    const normalized = await normalize19hzRow(cells, url);
    if (!normalized) continue;
    const haystack = [normalized.city, normalized.location, normalized.venueName].filter(Boolean).join(" ");
    if (!looksBayArea(haystack)) continue;
    events.push(normalized);
  }

  return events;
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
    const body = await req.json().catch(() => ({}));
    const apifyToken = Deno.env.get("APIFY_TOKEN");
    const raActorId = Deno.env.get("APIFY_RA_ACTOR_ID") ?? "chalkandcheese~ra-events-scraper";
    const raUrls = parseJsonArray<string>(Deno.env.get("APIFY_RA_URLS_JSON"), DEFAULT_RA_URLS);
    const hz19Url = Deno.env.get("BAY_AREA_19HZ_URL") ?? DEFAULT_19HZ_URL;
    const ticketmasterKey = Deno.env.get("TICKETMASTER_API_KEY") ??
      Deno.env.get("VITE_TICKETMASTER_API_KEY");
    const bayAreaCities = parseCityList(Deno.env.get("BAY_AREA_CITIES"));
    const jsonLdSources = parseJsonArray<JsonLdSource>(
      Deno.env.get("BAY_AREA_EVENT_URLS_JSON"),
      []
    );
    const tz = typeof body?.tz === "string" && body.tz ? body.tz : "America/Chicago";

    const [raRun, hz19Run, ticketmasterRun, jsonLdRun] = await Promise.all([
      runSource("ra", () => fetchResidentAdvisor(apifyToken, raActorId, raUrls)),
      runSource("19hz", () => fetch19hz(hz19Url)),
      runSource("ticketmaster", () => fetchTicketmaster(ticketmasterKey, bayAreaCities)),
      runSource("json_ld", () => fetchJsonLdSources(jsonLdSources)),
    ]);

    const sourceErrors = [raRun, hz19Run, ticketmasterRun, jsonLdRun]
      .filter((run): run is Extract<typeof run, { ok: false }> => !run.ok)
      .map((run) => run.error);

    const raEvents = raRun.ok ? raRun.data : [];
    const hz19Events = hz19Run.ok ? hz19Run.data : [];
    const ticketmasterEvents = ticketmasterRun.ok ? ticketmasterRun.data : [];
    const jsonLdEvents = jsonLdRun.ok ? jsonLdRun.data : [];

    const deduped = dedupeEvents([...raEvents, ...hz19Events, ...ticketmasterEvents, ...jsonLdEvents]);
    const upsertSummary = await upsertEvents(service, deduped);

    const { data: moveRefreshData, error: moveRefreshErr } = await service.rpc(
      "refresh_event_move_scores",
      { p_tz: tz }
    );
    if (moveRefreshErr) throw moveRefreshErr;

    return jsonResponse(200, {
      ok: true,
      timezone: tz,
      totals: {
        fetched: deduped.length,
        ra: raEvents.length,
        hz19: hz19Events.length,
        ticketmaster: ticketmasterEvents.length,
        json_ld: jsonLdEvents.length,
      },
      upsert: upsertSummary,
      move_refresh: moveRefreshData ?? null,
      sources: {
        ra_urls: raUrls,
        hz19_url: hz19Url,
        bay_area_cities: bayAreaCities,
        json_ld_sources: jsonLdSources.map((entry) => entry.url),
      },
      source_errors: sourceErrors,
    });
  } catch (err) {
    return jsonResponse(500, {
      error: "Bay Area event sync failed",
      message: errorToMessage(err),
    });
  }
});
