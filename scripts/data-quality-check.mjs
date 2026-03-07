/*
  Daily alpha data-quality audit.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:data-quality
*/

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isValidIsoDate(value) {
  if (!value || typeof value !== "string") return false;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts);
}

function isLikelyLocation(value) {
  if (!value || typeof value !== "string") return false;
  const t = value.trim();
  if (t.length < 3) return false;
  return /[a-z]/i.test(t);
}

function isLikelyImageUrl(value) {
  if (!value || typeof value !== "string") return false;
  const t = value.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://");
}

async function run() {
  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .select("id,title,event_source,source_event_id,event_date,location,image_url,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (eventsErr) {
    throw new Error(`Failed loading events: ${eventsErr.message}`);
  }

  const rows = events || [];
  const missingDate = [];
  const missingLocation = [];
  const malformedLocation = [];
  const missingImage = [];
  const malformedImage = [];

  const dedupeMap = new Map();

  for (const e of rows) {
    if (!isValidIsoDate(e.event_date)) missingDate.push(e);
    if (!e.location || !String(e.location).trim()) {
      missingLocation.push(e);
    } else if (!isLikelyLocation(e.location)) {
      malformedLocation.push(e);
    }

    if (!e.image_url || !String(e.image_url).trim()) {
      missingImage.push(e);
    } else if (!isLikelyImageUrl(e.image_url)) {
      malformedImage.push(e);
    }

    const source = (e.event_source || "").trim().toLowerCase();
    const sourceEventId = (e.source_event_id || "").trim();
    if (source && sourceEventId) {
      const key = `${source}:${sourceEventId}`;
      dedupeMap.set(key, (dedupeMap.get(key) || 0) + 1);
    }
  }

  const duplicateSourceIds = [...dedupeMap.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }))
    .slice(0, 50);

  const summary = {
    checked_at: new Date().toISOString(),
    total_events_scanned: rows.length,
    issues: {
      missing_date: missingDate.length,
      missing_location: missingLocation.length,
      malformed_location: malformedLocation.length,
      missing_image_url: missingImage.length,
      malformed_image_url: malformedImage.length,
      duplicate_source_event_ids: duplicateSourceIds.length,
    },
    samples: {
      missing_date: missingDate.slice(0, 5).map((e) => ({ id: e.id, title: e.title })),
      missing_location: missingLocation.slice(0, 5).map((e) => ({ id: e.id, title: e.title })),
      malformed_location: malformedLocation.slice(0, 5).map((e) => ({
        id: e.id,
        title: e.title,
        location: e.location,
      })),
      missing_image_url: missingImage.slice(0, 5).map((e) => ({ id: e.id, title: e.title })),
      malformed_image_url: malformedImage.slice(0, 5).map((e) => ({
        id: e.id,
        title: e.title,
        image_url: e.image_url,
      })),
      duplicate_source_event_ids: duplicateSourceIds,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  const criticalIssues =
    summary.issues.missing_date +
    summary.issues.malformed_location +
    summary.issues.duplicate_source_event_ids;

  if (criticalIssues > 0) {
    process.exitCode = 2;
  }
}

run().catch((err) => {
  console.error("Data quality check failed:", err);
  process.exit(1);
});
