import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_ALLOWED_EMAILS = ["hello@whozin.app", "jvincenthallahan@gmail.com"];
const DEFAULT_LOOKBACK_DAYS = 7;
const RETENTION_SUPPRESSION_HOURS = 24;
const SUPPORTED_TRIGGER_KEYS = new Set([
  "signup_no_friend",
  "signup_no_rsvp",
  "rsvp_no_invite",
]);

type CandidateUser = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  created_at: string | null;
};

type EventRow = {
  id: string;
  title: string | null;
  location: string | null;
  city: string | null;
  event_date: string | null;
};

type ReferralCountRow = {
  inviter_user_id: string;
  count: number;
};

type EmailEventRow = {
  id: string;
  status: string | null;
  sent_at: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  bounced_at?: string | null;
  complained_at?: string | null;
  provider_message_id?: string | null;
};

type CandidateResult = {
  user: CandidateUser;
  templateKey: string;
  triggerKey: string;
  eventId: string | null;
  subject: string;
  html: string;
  text: string;
  ctaUrl: string;
  unsubscribeUrl: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
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

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signUnsubscribeToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(encodedPayload)),
  );
  return `${encodedPayload}.${toBase64Url(signature)}`;
}

function buildDisplayName(user: CandidateUser): string {
  const displayName = (user.display_name ?? "").trim();
  if (displayName) return displayName;
  const username = (user.username ?? "").trim();
  if (username) return `@${username}`;
  return "there";
}

function formatEventDateLabel(value: string | null | undefined): string {
  if (!value) return "soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "soon";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventLocationLabel(event: EventRow | null | undefined): string {
  const location = (event?.location ?? "").trim();
  const city = (event?.city ?? "").trim();
  if (location && city && !location.toLowerCase().includes(city.toLowerCase())) {
    return `${location}, ${city}`;
  }
  return location || city || "Bay Area";
}

async function buildUnsubscribeUrl(args: {
  user: CandidateUser;
  siteUrl: string;
  unsubscribeSecret: string;
}): Promise<string> {
  const unsubscribeToken = await signUnsubscribeToken(
    {
      user_id: args.user.id,
      email: args.user.email,
      email_kind: "retention",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
    },
    args.unsubscribeSecret,
  );
  return `${args.siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
}

function buildEmailShell(args: {
  preheader: string;
  brandLabel?: string;
  heading: string;
  intro: string;
  body: string[];
  calloutLabel: string;
  calloutBody: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  postalAddress?: string | null;
}) {
  const postalAddress = (args.postalAddress ?? "").trim();
  const brandLabel = (args.brandLabel ?? "Whozin").trim() || "Whozin";
  const html = `
    <div style="margin:0;padding:0;background:#000000;font-family:Inter,Segoe UI,Arial,sans-serif;color:#ffffff;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        ${args.preheader}
      </div>
      <div style="background:
        radial-gradient(circle at 15% 10%, rgba(147,51,234,0.26), transparent 28%),
        radial-gradient(circle at 85% 85%, rgba(219,39,119,0.24), transparent 30%),
        linear-gradient(180deg, #050505 0%, #000000 100%);
        padding:40px 16px;">
        <div style="max-width:560px;margin:0 auto;">
          <div style="margin:0 auto 20px;width:72px;height:72px;border-radius:22px;background:linear-gradient(135deg,#db2777,#9333ea);box-shadow:0 0 40px rgba(219,39,119,0.35);text-align:center;line-height:72px;font-size:34px;font-weight:800;color:#ffffff;">
            W
          </div>
          <div style="text-align:center;margin-bottom:18px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#f9a8d4;">
            ${brandLabel}
          </div>
          <div style="background:rgba(17,17,17,0.92);border:1px solid rgba(255,255,255,0.08);border-radius:28px;padding:32px 28px;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
            <h1 style="margin:0 0 14px;font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-0.03em;">
              ${args.heading}
            </h1>
            <p style="margin:0 0 14px;color:#d4d4d8;font-size:16px;line-height:1.65;">
              ${args.intro}
            </p>
            ${args.body.map((line) => `
              <p style="margin:0 0 14px;color:#a1a1aa;font-size:15px;line-height:1.65;">
                ${line}
              </p>
            `).join("")}
            <div style="margin:0 0 24px;padding:16px 18px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(249,168,212,0.14);">
              <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#f9a8d4;margin-bottom:8px;">
                ${args.calloutLabel}
              </div>
              <div style="font-size:15px;line-height:1.6;color:#e4e4e7;">
                ${args.calloutBody}
              </div>
            </div>
            <a href="${args.ctaUrl}" style="display:inline-block;background:linear-gradient(90deg,#db2777,#9333ea);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:16px;font-weight:800;font-size:15px;box-shadow:0 0 24px rgba(219,39,119,0.28);">
              ${args.ctaLabel}
            </a>
            <p style="margin:22px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
              Or open this link:<br />
              <a href="${args.ctaUrl}" style="color:#f9a8d4;text-decoration:none;">${args.ctaUrl}</a>
            </p>
            <p style="margin:22px 0 0;color:#71717a;font-size:12px;line-height:1.6;">
              You are receiving this because you asked for optional Whozin email updates.
              <a href="${args.unsubscribeUrl}" style="color:#f9a8d4;text-decoration:none;">Unsubscribe instantly</a>
              or turn them off in your account settings.
            </p>
            ${postalAddress
              ? `<p style="margin:10px 0 0;color:#52525b;font-size:12px;line-height:1.6;">${postalAddress}</p>`
              : ""}
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    args.heading,
    "",
    args.intro,
    ...args.body,
    "",
    `${args.calloutLabel}: ${args.calloutBody}`,
    "",
    `${args.ctaLabel}: ${args.ctaUrl}`,
    "",
    `Unsubscribe: ${args.unsubscribeUrl}`,
    "You can also turn off optional Whozin email updates in your account settings.",
    ...(postalAddress ? ["", postalAddress] : []),
  ].join("\n");

  return { html, text };
}

async function buildSignupNoFriendEmail(args: {
  user: CandidateUser;
  siteUrl: string;
  unsubscribeSecret: string;
  postalAddress?: string | null;
}): Promise<CandidateResult> {
  const user = args.user;
  const name = buildDisplayName(user);
  const ctaUrl = `${args.siteUrl}/friends?onboarding=1&src=email_signup_no_friend`;
  const unsubscribeUrl = await buildUnsubscribeUrl(args);
  const subject = "Add one friend and Whozin instantly gets better";
  const body = buildEmailShell({
    preheader: "The app gets way more useful once your real people are in.",
    heading: "Start with your crew",
    intro: `${name}, the fastest way to make Whozin useful is to add one person you actually go out with.`,
    body: [
      "Once your people are in, the feed gets sharper, the right events stand out faster, and it becomes much easier to tell what the move is.",
    ],
    calloutLabel: "First move",
    calloutBody: "Add one real friend. That is when Whozin starts reading your actual night instead of just the city.",
    ctaLabel: "Add one friend",
    ctaUrl,
    unsubscribeUrl,
    postalAddress: args.postalAddress,
  });

  return {
    user,
    templateKey: "retention_signup_no_friend_v1",
    triggerKey: "signup_no_friend",
    eventId: null,
    subject,
    html: body.html,
    text: body.text,
    ctaUrl,
    unsubscribeUrl,
  };
}

async function buildSignupNoRsvpEmail(args: {
  user: CandidateUser;
  siteUrl: string;
  unsubscribeSecret: string;
  postalAddress?: string | null;
}): Promise<CandidateResult> {
  const user = args.user;
  const name = buildDisplayName(user);
  const ctaUrl = `${args.siteUrl}/explore?onboarding=1&src=email_signup_no_rsvp`;
  const unsubscribeUrl = await buildUnsubscribeUrl(args);
  const subject = "Pick a night to go out and see who's in";
  const body = buildEmailShell({
    preheader: "One RSVP is enough to make the app start feeling real.",
    heading: "Lock one plan",
    intro: `${name}, you are in. Now give Whozin one real signal by locking one event.`,
    body: [
      "The app starts to make sense once you put one real night on the board.",
      "One RSVP unlocks better social proof, better invites, and a much clearer read on where the night is going.",
    ],
    calloutLabel: "Fastest win",
    calloutBody: "Pick one event for this week. You do not need to do more than that to feel the product click.",
    ctaLabel: "Find one event",
    ctaUrl,
    unsubscribeUrl,
    postalAddress: args.postalAddress,
  });

  return {
    user,
    templateKey: "retention_signup_no_rsvp_v1",
    triggerKey: "signup_no_rsvp",
    eventId: null,
    subject,
    html: body.html,
    text: body.text,
    ctaUrl,
    unsubscribeUrl,
  };
}

async function buildRsvpNoInviteEmail(args: {
  user: CandidateUser;
  event: EventRow;
  siteUrl: string;
  unsubscribeSecret: string;
  postalAddress?: string | null;
}): Promise<CandidateResult> {
  const user = args.user;
  const name = buildDisplayName(user);
  const eventTitle = (args.event.title ?? "your event").trim() || "your event";
  const eventMeta = `${formatEventDateLabel(args.event.event_date)} at ${eventLocationLabel(args.event)}`;
  const ctaUrl = `${args.siteUrl}/event/${args.event.id}?src=email_rsvp_no_invite`;
  const unsubscribeUrl = await buildUnsubscribeUrl(args);
  const subject = `Send ${eventTitle} to a friend`;
  const body = buildEmailShell({
    preheader: "One clean share is usually enough to make the night move.",
    heading: "Bring one person in",
    intro: `${name}, you already locked ${eventTitle}. Now send it to the one friend most likely to say yes.`,
    body: [
      `${eventTitle} is coming up ${eventMeta}.`,
      "Whozin gets stronger when a real plan leaves your head and lands in one group chat.",
    ],
    calloutLabel: "Next move",
    calloutBody: "Share this event once. One real invite is worth more than broadcasting the app to a dozen random people.",
    ctaLabel: "Open event and share it",
    ctaUrl,
    unsubscribeUrl,
    postalAddress: args.postalAddress,
  });

  return {
    user,
    templateKey: "retention_rsvp_no_invite_v1",
    triggerKey: "rsvp_no_invite",
    eventId: args.event.id,
    subject,
    html: body.html,
    text: body.text,
    ctaUrl,
    unsubscribeUrl,
  };
}

async function loadUserById(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<CandidateUser | null> {
  const { data, error } = await service
    .from("profiles")
    .select("id,email,username,display_name,created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const user = data as CandidateUser;
  if (!user.id || !user.email) return null;
  return user;
}

async function loadLatestEventForUser(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<EventRow | null> {
  const { data: attendeeRows, error: attendeeErr } = await service
    .from("attendees")
    .select("event_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (attendeeErr) throw attendeeErr;

  const latest = ((attendeeRows ?? []) as Array<{ event_id: string; created_at: string | null }>)[0];
  if (!latest?.event_id) return null;

  const { data: event, error: eventErr } = await service
    .from("events")
    .select("id,title,location,city,event_date")
    .eq("id", latest.event_id)
    .maybeSingle();
  if (eventErr) throw eventErr;

  return (event ?? null) as EventRow | null;
}

async function isAuthorizedRequest(
  req: Request,
  service: ReturnType<typeof createClient>,
  serviceRoleKey: string,
): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const apikey = req.headers.get("apikey") ?? "";

  if (bearer && bearer === serviceRoleKey) return true;
  if (apikey && apikey === serviceRoleKey) return true;

  const bearerPayload = bearer ? decodeJwtPayload(bearer) : null;
  const apikeyPayload = apikey ? decodeJwtPayload(apikey) : null;
  const bearerRole = String(bearerPayload?.role ?? "").toLowerCase().trim();
  const apikeyRole = String(apikeyPayload?.role ?? "").toLowerCase().trim();
  if (bearerRole === "service_role" || bearerRole === "supabase_admin") return true;
  if (apikeyRole === "service_role" || apikeyRole === "supabase_admin") return true;

  if (!bearer) return false;

  const allowedEmails = (Deno.env.get("ADMIN_EMAILS") ?? DEFAULT_ALLOWED_EMAILS.join(","))
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  let email = String(bearerPayload?.email ?? "").toLowerCase().trim();
  if (!email) {
    const { data: userData, error: userErr } = await service.auth.getUser(bearer);
    if (!userErr && userData.user?.email) {
      email = userData.user.email.toLowerCase().trim();
    }
  }

  return allowedEmails.includes(email);
}

async function loadRecentUsers(
  service: ReturnType<typeof createClient>,
  args: { userId?: string | null; lookbackDays: number },
): Promise<CandidateUser[]> {
  const createdAfter = new Date(Date.now() - args.lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  let query = service
    .from("profiles")
    .select("id,email,username,display_name,created_at")
    .gte("created_at", createdAfter)
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (args.userId) query = query.eq("id", args.userId);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as CandidateUser[]).filter((user) => !!user.id && !!user.email);
}

async function loadFriendshipState(
  service: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data, error } = await service
    .from("friendships")
    .select("user_id,status")
    .in("user_id", userIds);
  if (error) throw error;

  return new Set(
    ((data ?? []) as Array<{ user_id: string; status: string | null }>)
      .filter((row) => ["accepted", "pending"].includes((row.status ?? "accepted").toLowerCase()))
      .map((row) => row.user_id),
  );
}

async function loadUsersWithRsvps(
  service: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data, error } = await service
    .from("attendees")
    .select("user_id")
    .in("user_id", userIds);
  if (error) throw error;

  return new Set(
    ((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id).filter(Boolean),
  );
}

async function loadUsersWithInviteEvents(
  service: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data, error } = await service
    .from("product_events")
    .select("user_id")
    .eq("event_name", "invite_sent")
    .in("user_id", userIds);
  if (error) throw error;

  return new Set(
    ((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id).filter(Boolean),
  );
}

async function loadSignupNoFriendCandidates(
  service: ReturnType<typeof createClient>,
  args: { userId?: string | null; lookbackDays: number },
): Promise<CandidateUser[]> {
  const users = await loadRecentUsers(service, args);
  if (users.length === 0) return [];
  const usersWithFriends = await loadFriendshipState(service, users.map((user) => user.id));
  return users.filter((user) => !usersWithFriends.has(user.id));
}

async function loadSignupNoRsvpCandidates(
  service: ReturnType<typeof createClient>,
  args: { userId?: string | null; lookbackDays: number },
): Promise<CandidateUser[]> {
  const users = await loadRecentUsers(service, args);
  if (users.length === 0) return [];
  const usersWithRsvps = await loadUsersWithRsvps(service, users.map((user) => user.id));
  return users.filter((user) => !usersWithRsvps.has(user.id));
}

async function loadRsvpNoInviteCandidates(
  service: ReturnType<typeof createClient>,
  args: { userId?: string | null; lookbackDays: number },
): Promise<Array<{ user: CandidateUser; event: EventRow }>> {
  const users = await loadRecentUsers(service, args);
  if (users.length === 0) return [];

  const userIds = users.map((user) => user.id);
  const usersWithInvites = await loadUsersWithInviteEvents(service, userIds);
  const candidateUsers = users.filter((user) => !usersWithInvites.has(user.id));
  if (candidateUsers.length === 0) return [];

  const { data: attendeeRows, error: attendeeErr } = await service
    .from("attendees")
    .select("user_id,event_id,created_at")
    .in("user_id", candidateUsers.map((user) => user.id))
    .order("created_at", { ascending: false });
  if (attendeeErr) throw attendeeErr;

  const latestEventByUser = new Map<string, { event_id: string; created_at: string | null }>();
  for (const row of (attendeeRows ?? []) as Array<{ user_id: string; event_id: string; created_at: string | null }>) {
    if (!row.user_id || !row.event_id || latestEventByUser.has(row.user_id)) continue;
    latestEventByUser.set(row.user_id, { event_id: row.event_id, created_at: row.created_at });
  }

  const eventIds = Array.from(new Set(Array.from(latestEventByUser.values()).map((row) => row.event_id)));
  if (eventIds.length === 0) return [];

  const { data: events, error: eventsErr } = await service
    .from("events")
    .select("id,title,location,city,event_date")
    .in("id", eventIds);
  if (eventsErr) throw eventsErr;

  const eventById = new Map(
    ((events ?? []) as EventRow[]).map((event) => [event.id, event]),
  );

  return candidateUsers
    .map((user) => {
      const latest = latestEventByUser.get(user.id);
      if (!latest) return null;
      const event = eventById.get(latest.event_id);
      if (!event) return null;
      return { user, event };
    })
    .filter((row): row is { user: CandidateUser; event: EventRow } => !!row);
}

async function loadCandidates(
  service: ReturnType<typeof createClient>,
  args: {
    triggerKey: string;
    userId?: string | null;
    forceSend?: boolean;
    lookbackDays: number;
    siteUrl: string;
    unsubscribeSecret: string;
    postalAddress?: string | null;
  },
): Promise<CandidateResult[]> {
  if (args.forceSend && args.userId) {
    const user = await loadUserById(service, args.userId);
    if (!user) return [];

    if (args.triggerKey === "signup_no_friend") {
      return [
        await buildSignupNoFriendEmail({
          user,
          siteUrl: args.siteUrl,
          unsubscribeSecret: args.unsubscribeSecret,
          postalAddress: args.postalAddress,
        }),
      ];
    }

    if (args.triggerKey === "signup_no_rsvp") {
      return [
        await buildSignupNoRsvpEmail({
          user,
          siteUrl: args.siteUrl,
          unsubscribeSecret: args.unsubscribeSecret,
          postalAddress: args.postalAddress,
        }),
      ];
    }

    if (args.triggerKey === "rsvp_no_invite") {
      const event = await loadLatestEventForUser(service, args.userId);
      if (!event) return [];
      return [
        await buildRsvpNoInviteEmail({
          user,
          event,
          siteUrl: args.siteUrl,
          unsubscribeSecret: args.unsubscribeSecret,
          postalAddress: args.postalAddress,
        }),
      ];
    }
  }

  if (args.triggerKey === "signup_no_friend") {
    const users = await loadSignupNoFriendCandidates(service, {
      userId: args.userId,
      lookbackDays: args.lookbackDays,
    });
    return Promise.all(
      users.map((user) =>
        buildSignupNoFriendEmail({
          user,
          siteUrl: args.siteUrl,
          unsubscribeSecret: args.unsubscribeSecret,
          postalAddress: args.postalAddress,
        }),
      ),
    );
  }

  if (args.triggerKey === "signup_no_rsvp") {
    const users = await loadSignupNoRsvpCandidates(service, {
      userId: args.userId,
      lookbackDays: args.lookbackDays,
    });
    return Promise.all(
      users.map((user) =>
        buildSignupNoRsvpEmail({
          user,
          siteUrl: args.siteUrl,
          unsubscribeSecret: args.unsubscribeSecret,
          postalAddress: args.postalAddress,
        }),
      ),
    );
  }

  if (args.triggerKey === "rsvp_no_invite") {
    const rows = await loadRsvpNoInviteCandidates(service, {
      userId: args.userId,
      lookbackDays: args.lookbackDays,
    });
    return Promise.all(
      rows.map(({ user, event }) =>
        buildRsvpNoInviteEmail({
          user,
          event,
          siteUrl: args.siteUrl,
          unsubscribeSecret: args.unsubscribeSecret,
          postalAddress: args.postalAddress,
        }),
      ),
    );
  }

  throw new Error(`Unsupported trigger_key: ${args.triggerKey}`);
}

async function getExistingEmailEvent(
  service: ReturnType<typeof createClient>,
  userId: string,
  triggerKey: string,
  eventId: string | null,
): Promise<EmailEventRow | null> {
  let query = service
    .from("email_events")
    .select("id,status,sent_at,delivered_at,opened_at,clicked_at,bounced_at,complained_at,provider_message_id")
    .eq("user_id", userId)
    .eq("trigger_key", triggerKey)
    .limit(1);

  query = eventId ? query.eq("event_id", eventId) : query.is("event_id", null);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as EmailEventRow[];
  return rows[0] ?? null;
}

async function sentRecently(
  service: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - RETENTION_SUPPRESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { count, error } = await service
    .from("email_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", since);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function shouldSuppressCandidate(
  service: ReturnType<typeof createClient>,
  candidate: CandidateResult,
): Promise<{ suppress: boolean; reason?: string; existingEvent?: EmailEventRow | null }> {
  const { data: emailable, error: emailableErr } = await service.rpc("is_user_emailable", {
    p_user_id: candidate.user.id,
    p_email_kind: "retention",
  });
  if (emailableErr) throw emailableErr;
  if (emailable !== true) return { suppress: true, reason: "user_not_emailable" };

  const existingEvent = await getExistingEmailEvent(
    service,
    candidate.user.id,
    candidate.triggerKey,
    candidate.eventId,
  );
  if (
    existingEvent &&
    (existingEvent.sent_at ||
      existingEvent.delivered_at ||
      existingEvent.opened_at ||
      existingEvent.clicked_at)
  ) {
    return { suppress: true, reason: "already_sent_for_trigger", existingEvent };
  }

  if (await sentRecently(service, candidate.user.id)) {
    return { suppress: true, reason: "sent_recently", existingEvent };
  }

  return { suppress: false, existingEvent };
}

async function sendViaResend(args: {
  apiKey: string;
  from: string;
  candidate: CandidateResult;
  idempotencyKey: string;
}): Promise<{ id: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.candidate.user.email],
      subject: args.candidate.subject,
      html: args.candidate.html,
      text: args.candidate.text,
    }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message ?? `Resend send failed (${res.status})`)
        : `Resend send failed (${res.status})`,
    );
  }

  const id = payload && typeof payload === "object" && "id" in payload
    ? String((payload as { id?: string }).id ?? "")
    : "";
  if (!id) throw new Error("Resend did not return an email id");
  return { id };
}

async function persistEmailEvent(
  service: ReturnType<typeof createClient>,
  args: {
    existingEvent?: EmailEventRow | null;
    candidate: CandidateResult;
    providerMessageId?: string | null;
    status: string;
    sentAt?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const payload = {
    user_id: args.candidate.user.id,
    event_id: args.candidate.eventId,
    provider: "resend",
    template_key: args.candidate.templateKey,
    trigger_key: args.candidate.triggerKey,
    status: args.status,
    provider_message_id: args.providerMessageId ?? null,
    sent_at: args.sentAt ?? null,
    metadata: {
      email: args.candidate.user.email,
      cta_url: args.candidate.ctaUrl,
      unsubscribe_url: args.candidate.unsubscribeUrl,
      ...(args.metadata ?? {}),
    },
  };

  if (args.existingEvent?.id) {
    const { error } = await service
      .from("email_events")
      .update(payload)
      .eq("id", args.existingEvent.id);
    if (error) throw error;
    return;
  }

  const { error } = await service.from("email_events").insert(payload);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  const rawSiteUrl = Deno.env.get("SITE_URL");
  const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET");
  const emailPostalAddress = Deno.env.get("EMAIL_POSTAL_ADDRESS");

  if (!supabaseUrl || !serviceRoleKey || !unsubscribeSecret) {
    return jsonResponse(500, { error: "Missing Supabase env" });
  }
  if (!rawSiteUrl) {
    return jsonResponse(500, { error: "Missing SITE_URL env" });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const isAuthorized = await isAuthorizedRequest(req, service, serviceRoleKey);
  if (!isAuthorized) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const triggerKey = typeof body?.trigger_key === "string" ? body.trigger_key.trim() : "";
    const dryRun = body?.dry_run !== false;
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : null;
    const forceSend = body?.force_send === true;
    const lookbackDays = Number.isFinite(Number(body?.lookback_days))
      ? Math.max(1, Number(body.lookback_days))
      : DEFAULT_LOOKBACK_DAYS;
    const siteUrl = normalizeSiteUrl(rawSiteUrl);

    if (!SUPPORTED_TRIGGER_KEYS.has(triggerKey)) {
      return jsonResponse(400, {
        error: "Unsupported trigger_key",
        supported_trigger_keys: Array.from(SUPPORTED_TRIGGER_KEYS),
      });
    }

    const candidates = await loadCandidates(service, {
      triggerKey,
      userId,
      forceSend,
      lookbackDays,
      siteUrl,
      unsubscribeSecret,
      postalAddress: emailPostalAddress,
    });

    const skipped: Array<Record<string, unknown>> = [];
    const readyToSend: Array<{ candidate: CandidateResult; existingEvent?: EmailEventRow | null }> = [];

    for (const candidate of candidates) {
      const suppression = await shouldSuppressCandidate(service, candidate);
      if (suppression.suppress) {
        skipped.push({
          user_id: candidate.user.id,
          email: candidate.user.email,
          trigger_key: candidate.triggerKey,
          event_id: candidate.eventId,
          reason: suppression.reason,
        });
        continue;
      }
      readyToSend.push({ candidate, existingEvent: suppression.existingEvent ?? null });
    }

    if (dryRun) {
      return jsonResponse(200, {
        ok: true,
        trigger_key: triggerKey,
        dry_run: true,
        evaluated: candidates.length,
        eligible: readyToSend.length,
        sent: 0,
        skipped,
        preview: readyToSend.slice(0, 10).map(({ candidate }) => ({
          user_id: candidate.user.id,
          email: candidate.user.email,
          username: candidate.user.username,
          template_key: candidate.templateKey,
          trigger_key: candidate.triggerKey,
          event_id: candidate.eventId,
          cta_url: candidate.ctaUrl,
          subject: candidate.subject,
          unsubscribe_url: candidate.unsubscribeUrl,
        })),
      });
    }

    if (!resendApiKey || !emailFrom) {
      return jsonResponse(500, {
        error: "Missing RESEND_API_KEY or EMAIL_FROM env",
      });
    }

    let sent = 0;
    const sendErrors: Array<Record<string, unknown>> = [];

    for (const { candidate, existingEvent } of readyToSend) {
      const idempotencyKey = `${candidate.triggerKey}:${candidate.user.id}:${candidate.eventId ?? "none"}`;
      try {
        const resendResult = await sendViaResend({
          apiKey: resendApiKey,
          from: emailFrom,
          candidate,
          idempotencyKey,
        });
        const sentAt = new Date().toISOString();

        await persistEmailEvent(service, {
          existingEvent,
          candidate,
          providerMessageId: resendResult.id,
          status: "sent",
          sentAt,
          metadata: {
            idempotency_key: idempotencyKey,
          },
        });

        await service
          .from("profiles")
          .update({ email_last_sent_at: sentAt })
          .eq("id", candidate.user.id);

        sent += 1;
      } catch (error) {
        const message = errorToMessage(error);
        sendErrors.push({
          user_id: candidate.user.id,
          email: candidate.user.email,
          trigger_key: candidate.triggerKey,
          event_id: candidate.eventId,
          reason: message,
        });

        await persistEmailEvent(service, {
          existingEvent,
          candidate,
          status: "failed",
          metadata: {
            error: message,
            idempotency_key: idempotencyKey,
          },
        });
      }
    }

    return jsonResponse(200, {
      ok: true,
      trigger_key: triggerKey,
      dry_run: false,
      evaluated: candidates.length,
      eligible: readyToSend.length,
      sent,
      skipped,
      errors: sendErrors,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Retention email send failed",
      message: errorToMessage(error),
    });
  }
});
