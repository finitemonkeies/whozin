/*
  Persist daily KPI aggregates into Postgres.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:kpi-refresh
    npm run ops:kpi-refresh -- --days 35 --tz America/Chicago
*/

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.findIndex((a) => a === `--${name}`);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};

const days = Number.parseInt(getArg("days", "35"), 10);
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
      (value.startsWith('"') && value.endsWith('"')) ||
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

if (!Number.isFinite(days) || days < 2) {
  console.error("--days must be an integer >= 2.");
  process.exit(1);
}

function localDay(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const now = new Date();
const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const end = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const startDate = localDay(start);
const endDate = localDay(end);

const functionUrl = `${url.replace(/\/+$/, "")}/functions/v1/kpi-refresh`;
const res = await fetch(functionUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    start_date: startDate,
    end_date: endDate,
    tz,
  }),
});

const payload = await res.json().catch(() => null);
if (!res.ok) {
  console.error("Daily KPI refresh failed:", payload ?? { status: res.status });
  process.exit(1);
}

console.log("Daily KPI refresh complete:", payload);
