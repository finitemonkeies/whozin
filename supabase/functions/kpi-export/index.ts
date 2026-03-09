import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
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

function localDay(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayNDaysAgo(n: number, tz: string): string {
  return localDay(new Date(Date.now() - n * 24 * 60 * 60 * 1000), tz);
}

function listRecentFullDays(n: number, tz: string): string[] {
  const out: string[] = [];
  for (let i = n; i >= 1; i--) out.push(dayNDaysAgo(i, tz));
  return out;
}

function listRecentFullWeeks(n: number, tz: string): string[] {
  const now = new Date();
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const dow = localNow.getDay();
  const diffToMonday = (dow + 6) % 7;
  const thisWeekMonday = new Date(localNow);
  thisWeekMonday.setDate(localNow.getDate() - diffToMonday);
  const weeks: string[] = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(thisWeekMonday);
    d.setDate(thisWeekMonday.getDate() - i * 7);
    weeks.push(localDay(d, tz));
  }
  return weeks;
}

function weekStartKey(date: Date, tz: string): string {
  const d = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  const dow = d.getDay();
  const diffToMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return localDay(d, tz);
}

async function fetchAll(
  service: ReturnType<typeof createClient>,
  table: string,
  select: string
): Promise<Record<string, unknown>[]> {
  const page = 1000;
  let from = 0;
  const out: Record<string, unknown>[] = [];
  while (true) {
    const to = from + page - 1;
    const { data, error } = await service.from(table).select(select).range(from, to);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as Record<string, unknown>[]));
    if (data.length < page) break;
    from += page;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const allowedEmails = new Set(["hello@whozin.app", "jvincenthallahan@gmail.com"]);
  const jwtPayload = decodeJwtPayload(token);
  let email = String(jwtPayload?.email ?? "").toLowerCase().trim();
  if (!email) {
    const { data: userData, error: userErr } = await service.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    email = (userData.user.email ?? "").toLowerCase().trim();
  }
  if (!allowedEmails.has(email)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const tz = "America/Chicago";
    const [profiles, attendees, friendships, productEvents, appErrorLogs] = await Promise.all([
      fetchAll(service, "profiles", "id,created_at"),
      fetchAll(service, "attendees", "user_id,event_id,created_at,rsvp_source"),
      fetchAll(service, "friendships", "user_id,friend_id,created_at"),
      fetchAll(service, "product_events", "event_name,source,created_at"),
      fetchAll(service, "app_error_logs", "surface,kind,created_at"),
    ]);

    const days7 = listRecentFullDays(7, tz);
    const weeks6 = listRecentFullWeeks(6, tz);
    const start7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const start24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trendRows = days7.map((d) => {
      const newUsers = profiles.filter((p) => p.created_at && localDay(new Date(String(p.created_at)), tz) === d);
      const dayAtt = attendees.filter((a) => a.created_at && localDay(new Date(String(a.created_at)), tz) === d);
      const dayFr = friendships.filter((f) => f.created_at && localDay(new Date(String(f.created_at)), tz) === d);
      const active = new Set([...dayAtt.map((x) => String(x.user_id)), ...dayFr.map((x) => String(x.user_id))]);
      return {
        section: "trend_7d",
        day_local: d,
        new_users: newUsers.length,
        active_users: active.size,
        rsvps: dayAtt.length,
        friend_adds: dayFr.length,
      };
    });

    const sourceCounts = new Map<string, number>();
    attendees
      .filter((a) => a.created_at && new Date(String(a.created_at)) >= start7d)
      .forEach((a) => {
        const s = (String(a.rsvp_source ?? "unknown").trim().toLowerCase() || "unknown");
        sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
      });
    const sourceRows = [...sourceCounts.entries()]
      .map(([source, count]) => ({ section: "rsvp_source_7d", source, rsvp_count: count }))
      .sort((a, b) => b.rsvp_count - a.rsvp_count);

    const weeklyRows = weeks6.map((w) => {
      const att = attendees.filter((a) => a.created_at && weekStartKey(new Date(String(a.created_at)), tz) === w);
      const fr = friendships.filter((f) => f.created_at && weekStartKey(new Date(String(f.created_at)), tz) === w);
      const active = new Set([...att.map((x) => String(x.user_id)), ...fr.map((x) => String(x.user_id))]);
      const rsvps = att.length;
      return {
        section: "weekly_efficiency_6w",
        week_start_local: w,
        rsvps,
        active_users: active.size,
        rsvps_per_active_user: active.size ? Number((rsvps / active.size).toFixed(4)) : 0,
      };
    });

    const pe7 = productEvents.filter((e) => e.created_at && new Date(String(e.created_at)) >= start7d);
    const baselineRows = [
      {
        section: "referral_baseline_7d",
        rsvps: attendees.filter((a) => a.created_at && new Date(String(a.created_at)) >= start7d).length,
        invite_sent: pe7.filter((e) => e.event_name === "invite_sent").length,
        invite_opened: pe7.filter((e) => e.event_name === "invite_link_opened").length,
        invite_signup_completed: pe7.filter((e) => e.event_name === "invite_signup_completed").length,
        invite_rsvp_completed: pe7.filter((e) => e.event_name === "invite_rsvp_completed").length,
      },
    ];

    const funnelEvents = ["event_detail_view", "invite_sent", "invite_link_copied", "invite_signup_completed", "invite_rsvp_completed"];
    const pe24 = productEvents.filter((e) => e.created_at && new Date(String(e.created_at)) >= start24h);
    const obsRows = funnelEvents.map((name) => ({
      section: "observability_funnel_24h",
      event_name: name,
      events_24h: pe24.filter((e) => e.event_name === name).length,
    }));

    const errMap = new Map<string, number>();
    appErrorLogs
      .filter((e) => e.created_at && new Date(String(e.created_at)) >= start24h)
      .forEach((e) => {
        const k = `${e.surface}:${e.kind}`;
        errMap.set(k, (errMap.get(k) ?? 0) + 1);
      });
    const errRows = [...errMap.entries()].map(([k, v]) => {
      const [surface, kind] = k.split(":");
      return { section: "errors_24h", surface, kind, errors_24h: v };
    });

    const csv = [
      rowsToCsv(trendRows),
      "",
      rowsToCsv(sourceRows),
      "",
      rowsToCsv(weeklyRows),
      "",
      rowsToCsv(baselineRows),
      "",
      rowsToCsv(obsRows),
      "",
      rowsToCsv(errRows),
    ].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"whozin_kpi_export_${new Date()
          .toISOString()
          .slice(0, 10)}.csv\"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "KPI export failed",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
