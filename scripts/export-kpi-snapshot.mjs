/*
  Live KPI snapshot exporter.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ops:kpi-export
    npm run ops:kpi-export -- --tz America/Chicago --out-dir reports
*/

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.findIndex((a) => a === `--${name}`);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};

const TZ = getArg("tz", "America/Chicago");
const OUT_DIR = getArg("out-dir", "reports");
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function localDay(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function dayNDaysAgo(n) {
  return localDay(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

function listRecentFullDays(n) {
  const days = [];
  for (let i = n; i >= 1; i--) days.push(dayNDaysAgo(i));
  return days;
}

function listRecentFullWeeks(n) {
  // week key as Monday local date string
  const now = new Date();
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const dow = localNow.getDay(); // 0 Sun..6 Sat
  const diffToMonday = (dow + 6) % 7;
  const thisWeekMonday = new Date(localNow);
  thisWeekMonday.setDate(localNow.getDate() - diffToMonday);
  const weeks = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(thisWeekMonday);
    d.setDate(thisWeekMonday.getDate() - i * 7);
    weeks.push(localDay(d));
  }
  return weeks;
}

function weekStartKey(date) {
  const d = new Date(date.toLocaleString("en-US", { timeZone: TZ }));
  const dow = d.getDay();
  const diffToMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return localDay(d);
}

async function fetchAll(table, select) {
  const page = 1000;
  let from = 0;
  const out = [];
  while (true) {
    const to = from + page - 1;
    const { data, error } = await supabase.from(table).select(select).range(from, to);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return out;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

async function run() {
  const [profiles, attendees, friendships, events, productEvents, referrals] = await Promise.all([
    fetchAll("profiles", "id,created_at"),
    fetchAll("attendees", "user_id,event_id,created_at,rsvp_source"),
    fetchAll("friendships", "user_id,friend_id,created_at"),
    fetchAll("events", "id,event_source,event_date,event_end_date"),
    fetchAll("product_events", "user_id,event_id,event_name,source,created_at"),
    fetchAll("referrals", "inviter_user_id,invitee_user_id,invite_open_count,opened_anonymous_count,opened_authenticated_count,created_at"),
  ]);

  let appErrorLogs = [];
  try {
    appErrorLogs = await fetchAll("app_error_logs", "surface,kind,created_at");
  } catch {
    appErrorLogs = [];
  }

  const days7 = listRecentFullDays(7);
  const weeks6 = listRecentFullWeeks(6);
  const start7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const start14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const start24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const trend = days7.map((d) => {
    const newUsers = profiles.filter((p) => p.created_at && localDay(new Date(p.created_at)) === d);
    const dayAtt = attendees.filter((a) => a.created_at && localDay(new Date(a.created_at)) === d);
    const dayFr = friendships.filter((f) => f.created_at && localDay(new Date(f.created_at)) === d);
    const activeUsers = new Set([...dayAtt.map((x) => x.user_id), ...dayFr.map((x) => x.user_id)]);

    const dayStart = new Date(`${d}T00:00:00`);
    const eventsHappening = events.filter((e) => {
      if (!e.event_date) return false;
      const start = localDay(new Date(e.event_date));
      const end = localDay(new Date(e.event_end_date || e.event_date));
      return start <= d && end >= d;
    }).length;

    return {
      day_local: d,
      new_users: newUsers.length,
      active_users: activeUsers.size,
      rsvps: dayAtt.length,
      friend_adds: dayFr.length,
      events_happening: eventsHappening,
    };
  });

  const rsvpSourceMap = new Map();
  attendees
    .filter((a) => a.created_at && new Date(a.created_at) >= start7d)
    .forEach((a) => {
      const s = (a.rsvp_source || "unknown").toString().trim().toLowerCase() || "unknown";
      rsvpSourceMap.set(s, (rsvpSourceMap.get(s) || 0) + 1);
    });
  const rsvpSourceSplit = [...rsvpSourceMap.entries()]
    .map(([source, count]) => ({ source, rsvp_count: count }))
    .sort((a, b) => b.rsvp_count - a.rsvp_count);

  const weekly = weeks6.map((w) => {
    const att = attendees.filter((a) => a.created_at && weekStartKey(new Date(a.created_at)) === w);
    const fr = friendships.filter((f) => f.created_at && weekStartKey(new Date(f.created_at)) === w);
    const active = new Set([...att.map((x) => x.user_id), ...fr.map((x) => x.user_id)]);
    return {
      week_start_local: w,
      rsvps: att.length,
      active_users: active.size,
      rsvps_per_active_user: active.size ? Number((att.length / active.size).toFixed(4)) : 0,
    };
  });

  const pe24 = productEvents.filter((e) => e.created_at && new Date(e.created_at) >= start24h);
  const funnel24h = ["event_detail_view", "invite_sent", "invite_link_copied", "invite_signup_completed", "invite_rsvp_completed"].map(
    (name) => ({
      event_name: name,
      events_24h: pe24.filter((e) => e.event_name === name).length,
    })
  );

  const errors24h = appErrorLogs
    .filter((e) => e.created_at && new Date(e.created_at) >= start24h)
    .reduce((acc, e) => {
      const key = `${e.surface}:${e.kind}`;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());
  const errorRows24h = [...errors24h.entries()].map(([k, count]) => {
    const [surface, kind] = k.split(":");
    return { surface, kind, errors_24h: count };
  });

  const ref7 = productEvents.filter((e) => e.created_at && new Date(e.created_at) >= start7d);
  const referralBaseline = {
    rsvps: attendees.filter((a) => a.created_at && new Date(a.created_at) >= start7d).length,
    invite_sent: ref7.filter((e) => e.event_name === "invite_sent").length,
    invite_opened: ref7.filter((e) => e.event_name === "invite_link_opened").length,
    invite_signup_completed: ref7.filter((e) => e.event_name === "invite_signup_completed").length,
    invite_rsvp_completed: ref7.filter((e) => e.event_name === "invite_rsvp_completed").length,
  };

  const snapshot = {
    generated_at: new Date().toISOString(),
    timezone: TZ,
    trend_7d: trend,
    rsvp_source_split_7d: rsvpSourceSplit,
    weekly_efficiency_6w: weekly,
    referral_baseline_7d: referralBaseline,
    observability_funnel_24h: funnel24h,
    errors_24h: errorRows24h,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUT_DIR, `kpi_snapshot_${stamp}.json`);
  const trendCsvPath = path.join(OUT_DIR, `kpi_trend_7d_${stamp}.csv`);
  const weeklyCsvPath = path.join(OUT_DIR, `kpi_weekly_6w_${stamp}.csv`);

  await fs.writeFile(jsonPath, JSON.stringify(snapshot, null, 2), "utf8");
  await fs.writeFile(trendCsvPath, toCsv(trend), "utf8");
  await fs.writeFile(weeklyCsvPath, toCsv(weekly), "utf8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${trendCsvPath}`);
  console.log(`Wrote ${weeklyCsvPath}`);
}

run().catch((err) => {
  console.error("KPI export failed:", err);
  process.exit(1);
});

