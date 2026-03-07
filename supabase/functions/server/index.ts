
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";

const app = new Hono();

app.use('*', logger(console.log));

const corsOrigins = (Deno.env.get("CORS_ORIGINS") || "https://whozin.app,https://www.whozin.app,http://localhost:5173")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  "/*",
  cors({
    origin: corsOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const signupAdminToken = Deno.env.get("SIGNUP_ADMIN_TOKEN") || "";

function serviceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getClientIp(c: any): string {
  const forwarded = c.req.header("x-forwarded-for") || "";
  const firstForwarded = forwarded.split(",").map((s: string) => s.trim()).find(Boolean);
  return (
    firstForwarded ||
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

function normalizeRateIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9@._:-]/g, "").slice(0, 120);
}

async function enforceRateLimit(opts: {
  scope: string;
  identity: string;
  windowMs: number;
  maxHits: number;
}) {
  const now = Date.now();
  const key = `rl:${opts.scope}:${normalizeRateIdentity(opts.identity)}`;
  const current = (await kv.get(key)) || { count: 0, resetAt: now + opts.windowMs };
  const resetAt = typeof current.resetAt === "number" ? current.resetAt : now + opts.windowMs;
  const withinWindow = resetAt > now;
  const next = withinWindow
    ? { count: Number(current.count || 0) + 1, resetAt }
    : { count: 1, resetAt: now + opts.windowMs };
  await kv.set(key, next);
  if (next.count > opts.maxHits) {
    const retryAfterSec = Math.max(1, Math.ceil((next.resetAt - now) / 1000));
    throw new Error(`RATE_LIMIT:${retryAfterSec}`);
  }
}

async function logEdgeError(kind: string, message: string, context: Record<string, unknown> = {}) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) return;
    await serviceClient().from("app_error_logs").insert({
      user_id: null,
      surface: "edge",
      kind,
      message: message.slice(0, 2000),
      stack: null,
      context,
    });
  } catch {
    // Error logging should never break edge responses.
  }
}

// Helper: Get User ID from Token
async function getUserId(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const supabase = serviceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

app.onError(async (err, c) => {
  await logEdgeError("server_unhandled", err?.message || "Unhandled edge error", {
    method: c.req.method,
    path: c.req.path,
    ip: getClientIp(c),
  });
  return c.json({ error: "Internal server error" }, 500);
});

// Health Check
app.get("/make-server-3b9fa398/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup
app.post("/make-server-3b9fa398/signup", async (c) => {
  if (!signupAdminToken) {
    return c.json({ error: "Signup endpoint is disabled" }, 403);
  }
  if (c.req.header("X-Admin-Token") !== signupAdminToken) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const { email, password, name } = body;
  const ip = getClientIp(c);
  const emailIdentity = typeof email === "string" ? email : "";
  try {
    await enforceRateLimit({
      scope: "signup_ip",
      identity: ip,
      windowMs: 10 * 60 * 1000,
      maxHits: 20,
    });
    if (emailIdentity) {
      await enforceRateLimit({
        scope: "signup_email",
        identity: emailIdentity,
        windowMs: 10 * 60 * 1000,
        maxHits: 5,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("RATE_LIMIT:")) {
      const retryAfterSec = Number(msg.split(":")[1] || "30");
      return c.json({ error: "Rate limit exceeded", retry_after_seconds: retryAfterSec }, 429);
    }
    throw e;
  }

  if (!email || !password || !name) {
    return c.json({ error: "Missing email, password, or name" }, 400);
  }

  const supabase = serviceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true
  });

  if (error) return c.json({ error: error.message }, 400);
  
  if (data.user) {
     const profile = { 
        id: data.user.id, 
        name, 
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`, 
        verified: false,
        handle: `@${name.toLowerCase().replace(/\s/g, '')}`
     };
     await kv.set(`profile:${data.user.id}`, profile);
  }

  return c.json({ user: data.user });
});

// Get Current User Profile
app.get("/make-server-3b9fa398/me", async (c) => {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const profile = await kv.get(`profile:${userId}`);
    return c.json(profile || { id: userId });
});

// Update Profile
app.put("/make-server-3b9fa398/me", async (c) => {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const body = await c.req.json();
    const { name, handle, avatar } = body;
    
    const existing = await kv.get(`profile:${userId}`) || { id: userId, verified: false };
    
    const updated = {
        ...existing,
        name: name || existing.name,
        handle: handle || existing.handle,
        avatar: avatar || existing.avatar
    };
    
    await kv.set(`profile:${userId}`, updated);
    return c.json(updated);
});

// Get Event Attendees
app.get("/make-server-3b9fa398/event/:id/attendees", async (c) => {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const eventId = c.req.param('id');
    const rsvps = await kv.getByPrefix(`rsvp:${eventId}:`); 
    // rsvps is array of { userId, timestamp }
    
    const userIds = rsvps.map((r: any) => r.userId);
    if (userIds.length === 0) return c.json([]);
    
    // De-duplicate
    const uniqueIds = [...new Set(userIds)] as string[];
    
    const profileKeys = uniqueIds.map(id => `profile:${id}`);
    const profiles = await kv.mget(profileKeys);
    
    return c.json(profiles.filter(p => p));
});

// Sync Ticket (RSVP)
app.post("/make-server-3b9fa398/rsvp", async (c) => {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const ip = getClientIp(c);
    try {
      await enforceRateLimit({
        scope: "rsvp_ip",
        identity: ip,
        windowMs: 30 * 1000,
        maxHits: 25,
      });
      await enforceRateLimit({
        scope: "rsvp_user",
        identity: userId,
        windowMs: 30 * 1000,
        maxHits: 12,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("RATE_LIMIT:")) {
        const retryAfterSec = Number(msg.split(":")[1] || "15");
        return c.json({ error: "Rate limit exceeded", retry_after_seconds: retryAfterSec }, 429);
      }
      throw e;
    }
    
    const { eventId } = await c.req.json();
    if (!eventId) return c.json({ error: "Missing eventId" }, 400);

    const rsvpData = { userId, eventId, timestamp: new Date().toISOString() };
    await kv.set(`rsvp:${eventId}:${userId}`, rsvpData);
    await kv.set(`wallet:${userId}:${eventId}`, rsvpData);
    
    return c.json({ success: true });
});

// Check if synced
app.get("/make-server-3b9fa398/event/:id/check-sync", async (c) => {
    const userId = await getUserId(c);
    if (!userId) return c.json({ synced: false });
    
    const eventId = c.req.param('id');
    const rsvp = await kv.get(`rsvp:${eventId}:${userId}`);
    return c.json({ synced: !!rsvp });
});

// Get Wallet
app.get("/make-server-3b9fa398/wallet", async (c) => {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const items = await kv.getByPrefix(`wallet:${userId}:`);
    const eventIds = items.map((i: any) => i.eventId);
    return c.json(eventIds);
});

Deno.serve(app.fetch);

