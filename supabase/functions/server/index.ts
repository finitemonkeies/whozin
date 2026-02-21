
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";

const app = new Hono();

app.use('*', logger(console.log));

const corsOrigins = (Deno.env.get("CORS_ORIGINS") || "http://localhost:5173")
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

// Helper: Get User ID from Token
async function getUserId(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

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

  if (!email || !password || !name) {
    return c.json({ error: "Missing email, password, or name" }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

