/*
  Browser-based Resident Advisor sync for Bay Area listings.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:ra-sync
    npm run ops:ra-sync -- --tz America/Chicago
*/

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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

const DEFAULT_START_URLS = [
  { url: "https://ra.co/events/us/sanfrancisco", city: "San Francisco" },
  { url: "https://ra.co/events/us/oakland", city: "Oakland" },
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

function stripTags(value) {
  return normalizeWhitespace(
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
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

function looksBayArea(text) {
  const lower = normalizeWhitespace(text).toLowerCase();
  if (!lower) return false;
  return BAY_AREA_CITY_HINTS.some((city) => lower.includes(city));
}

function isFutureDate(value) {
  if (!value) return false;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= Date.now() - 12 * 60 * 60 * 1000;
}

function extractHtmlMatch(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : null;
}

function extractHtmlAttr(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ? normalizeWhitespace(match[1]) : null;
}

function extractRaEventUrls(listingHtml) {
  const matches = listingHtml.matchAll(/href=["'](\/events\/\d+[^"']*)["']/gi);
  const urls = new Set();
  for (const match of matches) {
    const href = canonicalizeUrl(`https://ra.co${match[1] ?? ""}`);
    if (!href) continue;
    urls.add(href);
  }
  return Array.from(urls).slice(0, 120);
}

function detectRaBotBlock(html) {
  const lower = String(html ?? "").toLowerCase();
  if (!lower) return null;
  if (lower.includes("datadome captcha") || lower.includes("captcha-delivery.com")) {
    return "datadome_captcha";
  }
  if (lower.includes("enable javascript and cookies to continue")) {
    return "browser_challenge";
  }
  return null;
}

function monthFromLabel(value) {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = months.indexOf(String(value ?? "").trim().slice(0, 3).toLowerCase());
  return idx >= 0 ? idx : null;
}

function parseRaDateTime(dateLabel, timeRangeLabel) {
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

function extractJsonLdBlocks(html) {
  return Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi), (m) => m[1]).filter(Boolean);
}

function collectJsonLdEvents(node, acc) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdEvents(item, acc);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node;
  const typeRaw = obj["@type"];
  const typeList = Array.isArray(typeRaw) ? typeRaw : [typeRaw];
  if (typeList.some((entry) => String(entry ?? "").toLowerCase() === "event")) {
    acc.push(obj);
  }
  if (Array.isArray(obj.itemListElement)) {
    collectJsonLdEvents(obj.itemListElement, acc);
  }
  if (obj["@graph"]) {
    collectJsonLdEvents(obj["@graph"], acc);
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function normalizeJsonLdEvent(node, fallbackCity, eventUrl) {
  const title = firstString(node.name, node.headline);
  const start = firstString(node.startDate);
  if (!title || !start) return null;

  const locationName =
    firstString(node.location?.name, node.location?.address?.name, node.location?.address?.addressLocality) ?? null;
  const city =
    firstString(node.location?.address?.addressLocality, fallbackCity) ?? null;
  const imageValue = Array.isArray(node.image) ? node.image[0] : node.image;
  const imageUrl = canonicalizeUrl(firstString(typeof imageValue === "string" ? imageValue : imageValue?.url));
  const description = firstString(node.description);
  const ticketUrl = canonicalizeUrl(firstString(node.offers?.url, node.url, eventUrl));
  const externalUrl = canonicalizeUrl(firstString(node.url, eventUrl));
  const sourceEventId =
    firstString(externalUrl?.match(/\/events\/(\d+)/)?.[1]) ?? sha1(`${title}|${start}|${locationName ?? ""}`);

  return {
    title,
    event_date: new Date(start).toISOString(),
    event_end_date: node.endDate ? new Date(node.endDate).toISOString() : null,
    location: locationName,
    venue_name: locationName,
    city,
    image_url: imageUrl,
    ticket_url: ticketUrl,
    external_url: externalUrl,
    description,
    event_source: "ra",
    source_event_id: sourceEventId,
  };
}

function parseResidentAdvisorEventPage(eventUrl, html, fallbackCity) {
  for (const block of extractJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const nodes = [];
      collectJsonLdEvents(parsed, nodes);
      for (const node of nodes) {
        const normalized = normalizeJsonLdEvent(node, fallbackCity, eventUrl);
        if (normalized) return normalized;
      }
    } catch {
      // Ignore malformed blocks and continue to HTML parsing.
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
    extractHtmlAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const imageUrl =
    extractHtmlAttr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    extractHtmlAttr(html, /<img[^>]+src=["']([^"']+)["'][^>]*alt=["'][^"']*Flyer[^"']*["']/i);
  const { start, end } = parseRaDateTime(dateLabel, timeRangeLabel);
  if (!title || !start) return null;

  const city = fallbackCity ?? (venue && looksBayArea(venue) ? venue : null);
  const sourceEventId = firstString(eventUrl.match(/\/events\/(\d+)/)?.[1]) ?? sha1(`${title}|${start}|${venue ?? ""}`);

  return {
    title,
    event_date: start,
    event_end_date: end,
    location: venue,
    venue_name: venue,
    city,
    image_url: canonicalizeUrl(imageUrl),
    ticket_url: eventUrl,
    external_url: eventUrl,
    description,
    event_source: "ra",
    source_event_id: sourceEventId,
  };
}

async function collectListingHtml(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.mouse.move(200, 200).catch(() => null);
  await page.waitForTimeout(800);
  return page.content();
}

async function collectEventHtml(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1800);
  return page.content();
}

async function upsertEvents(supabase, rows) {
  if (rows.length === 0) return { upserted: 0 };
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
  const sourceConfigs = parseJsonArray(process.env.RA_SOURCE_URLS_JSON, DEFAULT_START_URLS);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: tz,
    viewport: { width: 1440, height: 2200 },
  });
  const page = await context.newPage();

  const debug = {
    sources: sourceConfigs.length,
    source_failures: [],
    blocked_sources: [],
    discovered_event_urls: 0,
    detail_failures: [],
    blocked_event_pages: [],
    parsed_events: 0,
    filtered_out: 0,
  };

  try {
    const targets = [];
    for (const config of sourceConfigs) {
      try {
        const html = await collectListingHtml(page, config.url);
        const blockReason = detectRaBotBlock(html);
        if (blockReason) {
          debug.blocked_sources.push({
            url: config.url,
            reason: blockReason,
          });
          continue;
        }
        const urls = extractRaEventUrls(html);
        debug.discovered_event_urls += urls.length;
        for (const eventUrl of urls) {
          targets.push({ eventUrl, city: config.city ?? null });
        }
      } catch (error) {
        debug.source_failures.push({
          url: config.url,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const dedupedTargets = Array.from(new Map(targets.map((entry) => [entry.eventUrl, entry])).values()).slice(0, 90);
    const rows = [];
    for (const target of dedupedTargets) {
      try {
        const html = await collectEventHtml(page, target.eventUrl);
        const blockReason = detectRaBotBlock(html);
        if (blockReason) {
          debug.blocked_event_pages.push({
            url: target.eventUrl,
            reason: blockReason,
          });
          continue;
        }
        const row = parseResidentAdvisorEventPage(target.eventUrl, html, target.city);
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
      } catch (error) {
        debug.detail_failures.push({
          url: target.eventUrl,
          message: error instanceof Error ? error.message : String(error),
        });
      }
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
  console.error("RA Playwright sync failed:", err);
  process.exit(1);
});
