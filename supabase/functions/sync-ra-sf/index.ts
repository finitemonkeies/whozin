import { createClient } from "jsr:@supabase/supabase-js@2";

type RaRawItem = Record<string, unknown>;

type NormalizedEvent = {
  title: string;
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_ALLOWED_EMAILS = ["hello@whozin.app", "jvincenthallahan@gmail.com"];

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    const s = asString(v);
    if (s) return s;
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

function pickImageUrl(item: RaRawItem): string | null {
  const direct = firstString(item.image, item.imageUrl, item.img, item.thumbnail);
  if (direct) return direct;

  const images = item.images;
  if (Array.isArray(images)) {
    for (const entry of images) {
      if (typeof entry === "string") {
        const s = asString(entry);
        if (s) return s;
      }
      if (entry && typeof entry === "object") {
        const url = asString((entry as Record<string, unknown>).url);
        if (url) return url;
      }
    }
  }
  return null;
}

function pickVenueName(item: RaRawItem): string | null {
  const venue = item.venue;
  if (venue && typeof venue === "object") {
    const venueObj = venue as Record<string, unknown>;
    return firstString(venueObj.name, venueObj.title, venueObj.venueName);
  }
  return firstString(item.venueName, item.club, item.locationName, item.venue);
}

function pickCity(item: RaRawItem, locationText: string | null): string | null {
  const city = firstString(item.city, item.town, item.area);
  if (city) return city;
  if (!locationText) return null;
  const lower = locationText.toLowerCase();
  if (lower.includes("san francisco")) return "San Francisco";
  if (lower.includes("oakland")) return "Oakland";
  return null;
}

function pickLatLng(item: RaRawItem): { lat: number | null; lng: number | null } {
  const latRaw = item.lat ?? item.latitude;
  const lngRaw = item.lng ?? item.lon ?? item.longitude;
  const lat = typeof latRaw === "number" ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === "number" ? lngRaw : Number(lngRaw);
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function normalizeRaItem(item: RaRawItem): Promise<NormalizedEvent | null> {
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

  const eventUrl = firstString(item.url, item.eventUrl, item.link);
  const ticketUrl = firstString(item.ticketUrl, item.ticketsUrl, item.ticket_link, eventUrl);
  const venueName = pickVenueName(item);
  const location = firstString(item.location, item.address, item.areaName, venueName);
  const city = pickCity(item, location);
  const { lat, lng } = pickLatLng(item);
  const imageUrl = pickImageUrl(item);
  const description = firstString(item.description, item.summary, item.content);

  const sourceEventId =
    firstString(item.id, item.eventId, item.raId) ??
    (await sha1(`${title}|${venueName ?? ""}|${start}`));

  return {
    title,
    sourceEventId,
    eventDateIso: start,
    eventEndDateIso: end,
    location,
    venueName,
    city,
    lat,
    lng,
    imageUrl,
    ticketUrl,
    externalUrl: eventUrl,
    description,
  };
}

function buildApifyUrl(actorId: string, token: string): string {
  const params = new URLSearchParams({
    token,
    format: "json",
  });
  return `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?${params.toString()}`;
}

function buildApifyInput() {
  const today = new Date();
  const plus21 = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
  return {
    startUrls: [{ url: "https://ra.co/events/us/sanfrancisco" }],
    dateRangeFrom: today.toISOString().slice(0, 10),
    dateRangeTo: plus21.toISOString().slice(0, 10),
    maxItems: 40,
    enforceMaxItems: true,
    maxErrors: 0,
    downloadDelay: 500,
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
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  const actorId = Deno.env.get("APIFY_RA_ACTOR_ID") ?? "chalkandcheese~ra-events-scraper";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }
  if (!apifyToken) {
    return jsonResponse(500, { error: "Missing APIFY_TOKEN" });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return jsonResponse(401, { error: "Missing bearer token" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await service.auth.getUser(token);
  if (userErr || !userData.user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const email = (userData.user.email ?? "").toLowerCase();
  const allowedEmails = (Deno.env.get("ADMIN_EMAILS") ?? DEFAULT_ALLOWED_EMAILS.join(","))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.includes(email)) {
    return jsonResponse(403, { error: "Forbidden" });
  }

  const apifyUrl = buildApifyUrl(actorId, apifyToken);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let items: RaRawItem[] = [];
  try {
    const apifyRes = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildApifyInput()),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!apifyRes.ok) {
      const body = await apifyRes.text();
      return jsonResponse(502, {
        error: "Apify request failed",
        status: apifyRes.status,
        body: body.slice(0, 600),
      });
    }

    const parsed = await apifyRes.json();
    if (!Array.isArray(parsed)) {
      return jsonResponse(502, { error: "Unexpected Apify payload shape" });
    }
    items = parsed as RaRawItem[];
  } catch (err) {
    clearTimeout(timeout);
    return jsonResponse(502, {
      error: "Apify fetch error",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const errors: Array<{ index: number; message: string }> = [];
  const normalized: NormalizedEvent[] = [];
  for (let i = 0; i < items.length; i++) {
    try {
      const event = await normalizeRaItem(items[i]);
      if (!event) {
        errors.push({ index: i, message: "Missing required fields (title/start_time)" });
        continue;
      }
      normalized.push(event);
    } catch (err) {
      errors.push({
        index: i,
        message: err instanceof Error ? err.message : "Normalization failed",
      });
    }
  }

  const dedupMap = new Map<string, NormalizedEvent>();
  for (const e of normalized) dedupMap.set(e.sourceEventId, e);
  const deduped = Array.from(dedupMap.values());

  if (deduped.length === 0) {
    return jsonResponse(200, {
      fetched: items.length,
      upserted: 0,
      inserted: 0,
      updated: 0,
      skipped: errors.length,
      errors,
    });
  }

  const keys = deduped.map((e) => e.sourceEventId);
  const { data: existingRows, error: existingErr } = await service
    .from("events")
    .select("source_event_id")
    .eq("event_source", "ra")
    .in("source_event_id", keys);

  if (existingErr) {
    return jsonResponse(500, { error: existingErr.message });
  }

  const existingSet = new Set((existingRows ?? []).map((r: any) => r.source_event_id as string));

  const rows = deduped.map((e) => ({
    title: e.title,
    event_date: e.eventDateIso,
    event_end_date: e.eventEndDateIso,
    location: e.location,
    venue_name: e.venueName,
    city: e.city,
    lat: e.lat,
    lng: e.lng,
    image_url: e.imageUrl,
    ticket_url: e.ticketUrl,
    external_url: e.externalUrl,
    description: e.description,
    event_source: "ra",
    source_event_id: e.sourceEventId,
  }));

  const chunkSize = 25;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error: upsertErr } = await service
      .from("events")
      .upsert(chunk, { onConflict: "event_source,source_event_id" });

    if (upsertErr) {
      return jsonResponse(500, { error: upsertErr.message, chunk_start: i });
    }
    upserted += chunk.length;
  }
  const inserted = rows.filter((r) => !existingSet.has(r.source_event_id)).length;
  const updated = Math.max(0, upserted - inserted);

  return jsonResponse(200, {
    fetched: items.length,
    upserted,
    inserted,
    updated,
    skipped: errors.length,
    errors: errors.slice(0, 25),
  });
});
