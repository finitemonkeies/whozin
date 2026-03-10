/*
  Security smoke checks for production/staging.
  Usage:
    WHOZIN_SERVER_URL=https://<your-function-host> npm run security:smoke

  Fallback (auto-derives functions base):
    SUPABASE_URL=https://<project-ref>.supabase.co npm run security:smoke
    VITE_SUPABASE_URL=https://<project-ref>.supabase.co npm run security:smoke

  Optional:
    WHOZIN_EVENT_ID=<event-id> (defaults to "smoke-test-event")
*/

const derivedFromSupabase =
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const base = (
  process.env.WHOZIN_SERVER_URL ||
  (derivedFromSupabase ? `${derivedFromSupabase}/functions/v1` : "")
).replace(/\/+$/, "");
const eventId = process.env.WHOZIN_EVENT_ID || "smoke-test-event";

if (!base) {
  console.error("Missing WHOZIN_SERVER_URL or SUPABASE_URL/VITE_SUPABASE_URL env var.");
  process.exit(1);
}

const routes = {
  attendees: `${base}/make-server-3b9fa398/event/${encodeURIComponent(eventId)}/attendees`,
  signup: `${base}/make-server-3b9fa398/signup`,
  health: `${base}/make-server-3b9fa398/health`,
};

async function run() {
  const results = [];

  const healthRes = await fetch(routes.health);
  results.push({
    name: "health endpoint reachable",
    ok: healthRes.ok,
    detail: `status=${healthRes.status}`,
  });

  const attendeesRes = await fetch(routes.attendees);
  results.push({
    name: "unauth attendees is blocked",
    ok: attendeesRes.status === 401,
    detail: `status=${attendeesRes.status} (expected 401)`,
  });

  const signupRes = await fetch(routes.signup, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "smoke-test@example.com",
      password: "not-used-12345678",
      name: "Smoke Test",
    }),
  });
  results.push({
    name: "signup blocked without admin token",
    ok: signupRes.status === 403,
    detail: `status=${signupRes.status} (expected 403)`,
  });

  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    const prefix = r.ok ? "PASS" : "FAIL";
    console.log(`${prefix}: ${r.name} -> ${r.detail}`);
  }

  if (failed.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Smoke check crashed:", err);
  process.exit(1);
});
