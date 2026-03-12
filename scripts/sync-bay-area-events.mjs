/*
  Run Bay Area event ingestion across configured sources.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:event-sync
    npm run ops:event-sync -- --tz America/Chicago
*/

import fs from "node:fs";
import path from "node:path";

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

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Checked process env plus .env.ops, .env.local, and .env."
  );
  process.exit(1);
}

const functionUrl = `${url.replace(/\/+$/, "")}/functions/v1/sync-bay-area-events`;
const res = await fetch(functionUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ tz }),
});

const payload = await res.json().catch(() => null);
if (!res.ok) {
  console.error("Bay Area event sync failed:", payload ?? { status: res.status });
  process.exit(1);
}

console.log("Bay Area event sync complete:", payload);
