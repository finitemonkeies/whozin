/*
  Browser-based Shotgun sync for Bay Area nightlife pages.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:shotgun-sync
    npm run ops:shotgun-sync -- --tz America/Chicago
*/

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.findIndex((a) => a === `--${name}`);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};

const tz = getArg("tz", "America/Chicago");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

for (const candidate of [".env.ops", ".env.local", ".env"]) {
  loadEnvFile(path.resolve(process.cwd(), candidate));
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Checked process env plus .env.ops, .env.local, and .env."
  );
  process.exit(1);
}

const DEFAULT_SOURCES = [
  { url: "https://shotgun.live/en/venues/boof", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/le-club-society", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/hard-reset-presents", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/queen-out", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/program", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/hardreset", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/reflections-fm", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/zanzi-live", city: "Oakland" },
  { url: "https://shotgun.live/en/venues/paracosm", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/all-i-need-events", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/flop", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/texture-summit", city: "San Francisco" },
  { url: "https://shotgun.live/en/venues/yuksel-presents", city: "San Francisco" },
  { url: "https://shotgun.live/en/cities/san-francisco", city: "San Francisco" },
  { url: "https://shotgun.live/en/cities/oakland", city: "Oakland" },
  { url: "https://shotgun.live/en/cities/san-francisco/afro", city: "San Francisco" },
  { url: "https://shotgun.live/en/cities/san-francisco/house", city: "San Francisco" },
  { url: "https://shotgun.live/en/cities/san-francisco/techno", city: "San Francisco" },
  { url: "https://shotgun.live/en/cities/san-francisco/club", city: "San Francisco" },
  { url: "https://shotgun.live/en/cities/oakland/house", city: "Oakland" },
];

function parseJsonArray(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeUrl(value) {
  const text = normalizeWhitespace(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    url.hash = "";
    return url.toString();
  } catch {
    return text;
  }
}

function parseMonth(mon) {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = months.indexOf(String(mon ?? "").slice(0, 3).toLowerCase());
  return idx >= 0 ? idx : null;
}

function inferYear(month, day) {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), month, day, 0, 0, 0));
  if (candidate.getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000) {
    return now.getUTCFullYear() + 1;
  }
  return now.getUTCFullYear();
}

function parseShotgunDateLabel(label) {
  const text = normalizeWhitespace(label);
  const match = text.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3})\s+from\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  if (!match) return { start: null, end: null };

  const day = Number(match[1]);
  const month = parseMonth(match[2]);
  if (month === null || !Number.isFinite(day)) return { start: null, end: null };
  const year = inferYear(month, day);

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

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function buildSourceEventId(url) {
  const match = String(url ?? "").match(/\/events\/([^/?#]+)/i);
  return match?.[1] ?? String(url ?? "");
}

function looksBayArea(text) {
  const lower = normalizeWhitespace(text).toLowerCase();
  if (!lower) return false;
  return [
    "san francisco",
    "oakland",
    "berkeley",
    "san jose",
    "santa cruz",
    "palo alto",
    "mountain view",
    "san mateo",
    "redwood city",
  ].some((city) => lower.includes(city));
}

function isFutureDate(value) {
  if (!value) return false;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= Date.now() - 12 * 60 * 60 * 1000;
}

async function collectEventUrls(page, sourceUrl) {
  await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);
  const hrefs = await page.locator('a[href*="/en/events/"]').evaluateAll((els) =>
    els.map((el) => el.getAttribute("href")).filter(Boolean)
  );
  const urls = new Map();
  for (const href of hrefs) {
    const full = canonicalizeUrl(new URL(href, "https://shotgun.live").toString());
    if (!full) continue;
    urls.set(full, full);
  }
  return Array.from(urls.values()).slice(0, 60);
}

async function parseEventPage(page, eventUrl, fallbackCity) {
  await page.goto(eventUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1200);

  const title = normalizeWhitespace(await page.locator("h1").first().textContent().catch(() => ""));
  if (!title) return null;

  const bodyText = normalizeWhitespace(await page.locator("body").textContent().catch(() => ""));
  const dateMatch = bodyText.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+[A-Za-z]{3}\s+from\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s+to\s+\d{1,2}:\d{2}\s*(?:AM|PM)/i
  );
  const dateRange = parseShotgunDateLabel(dateMatch?.[0] ?? null);
  if (!dateRange.start) return null;

  const locationMatch =
    bodyText.match(/to\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s+(.+?)\s+(?:\d+\s+are interested|Interested|Description)/i) ??
    bodyText.match(/Location\s+(.+?)\s+(?:Description|Lineup|Tickets)/i);
  const location = normalizeWhitespace(locationMatch?.[1] ?? fallbackCity ?? "");
  const description = normalizeWhitespace(
    await page.locator('meta[name="description"]').getAttribute("content").catch(() => "")
  ) || null;
  const imageUrl =
    canonicalizeUrl(await page.locator('meta[property="og:image"]').getAttribute("content").catch(() => "")) || null;

  const city = looksBayArea(location) ? location : fallbackCity ?? null;

  return {
    title,
    event_date: dateRange.start,
    event_end_date: dateRange.end,
    location: location || fallbackCity || null,
    venue_name: location || fallbackCity || null,
    city,
    image_url: imageUrl,
    ticket_url: eventUrl,
    external_url: eventUrl,
    description,
    event_source: "shotgun",
    source_event_id: buildSourceEventId(eventUrl),
  };
}

async function upsertEvents(supabase, rows) {
  if (rows.length === 0) {
    return { upserted: 0 };
  }
  const dedupedRows = Array.from(
    new Map(rows.map((row) => [`${row.event_source}::${row.source_event_id}`, row])).values()
  );
  const chunkSize = 25;
  let upserted = 0;
  for (let i = 0; i < dedupedRows.length; i += chunkSize) {
    const chunk = dedupedRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("events").upsert(chunk, {
      onConflict: "event_source,source_event_id",
    });
    if (error) throw error;
    upserted += chunk.length;
  }
  return { upserted };
}

async function refreshMoveScores(supabase) {
  const { data, error } = await supabase.rpc("refresh_event_move_scores", { p_tz: tz });
  if (error) throw error;
  return data ?? null;
}

async function run() {
  const sourceConfigs = parseJsonArray(process.env.SHOTGUN_SOURCE_URLS_JSON, DEFAULT_SOURCES);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: tz,
  });
  const page = await context.newPage();

  const debug = {
    sources: sourceConfigs.length,
    source_failures: [],
    discovered_event_urls: 0,
    parsed_events: 0,
    filtered_out: 0,
  };

  try {
    const eventTargets = [];
    for (const config of sourceConfigs) {
      try {
        const urls = await collectEventUrls(page, config.url);
        debug.discovered_event_urls += urls.length;
        for (const url of urls) {
          eventTargets.push({ url, city: config.city ?? null });
        }
      } catch (error) {
        debug.source_failures.push({
          url: config.url,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const dedupedTargets = Array.from(new Map(eventTargets.map((entry) => [entry.url, entry])).values());
    const rows = [];
    for (const target of dedupedTargets) {
      const row = await parseEventPage(page, target.url, target.city);
      if (!row) {
        debug.filtered_out += 1;
        continue;
      }
      if (!looksBayArea([row.city, row.location, row.venue_name].filter(Boolean).join(" "))) {
        debug.filtered_out += 1;
        continue;
      }
      if (!isFutureDate(row.event_date)) {
        debug.filtered_out += 1;
        continue;
      }
      rows.push(row);
      debug.parsed_events += 1;
    }

    const upsert = await upsertEvents(supabase, rows);
    const moveRefresh = await refreshMoveScores(supabase);
    console.log(
      JSON.stringify(
        {
          ok: true,
          timezone: tz,
          sources: sourceConfigs.map((entry) => entry.url),
          debug,
          upsert,
          move_refresh: moveRefresh,
        },
        null,
        2
      )
    );
  } finally {
    await page.close().catch(() => null);
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
  }
}

run().catch((err) => {
  console.error("Shotgun Playwright sync failed:", err);
  process.exit(1);
});
