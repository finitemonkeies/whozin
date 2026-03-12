type VercelRequest = {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  url?: string;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

type InviteProfile = {
  username?: string | null;
  display_name?: string | null;
};

type InviteEvent = {
  id: string;
  title: string | null;
  location: string | null;
  city: string | null;
  venue_name: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  event_source?: string | null;
  moderation_status?: string | null;
};

const hiddenSources = new Set(["ra", "ticketmaster_artist", "ticketmaster_nearby", "eventbrite"]);

function getSingle(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getOrigin(req: VercelRequest): string {
  const forwardedProto = getSingle(req.headers["x-forwarded-proto"]) || "https";
  const forwardedHost = getSingle(req.headers["x-forwarded-host"]) || getSingle(req.headers.host);
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const configuredSiteUrl =
    process.env.VITE_SITE_URL?.trim() || process.env.SITE_URL?.trim() || "https://www.whozin.app";
  try {
    return new URL(configuredSiteUrl).origin;
  } catch {
    return "https://www.whozin.app";
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function canSurfaceSource(source: string | null | undefined): boolean {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized) return true;
  if (!hiddenSources.has(normalized)) return true;
  return (process.env.VITE_SURFACE_INGESTED_SOURCES ?? "").trim().toLowerCase() === "true";
}

function isEventVisible(event: InviteEvent | null): boolean {
  if (!event) return false;
  const moderationStatus = (event.moderation_status ?? "").trim().toLowerCase();
  if (moderationStatus === "quarantined" || moderationStatus === "hidden") return false;
  return canSurfaceSource(event.event_source);
}

function formatEventDate(eventDate: string | null): string {
  if (!eventDate) return "Date TBA";
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return "Date TBA";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildEventDescription(event: InviteEvent | null, inviterLabel: string): string {
  if (!event) {
    return `${inviterLabel} invited you to connect on Whozin. See who is going before you go.`;
  }

  const parts = [
    `${inviterLabel} wants you there.`,
    formatEventDate(event.event_date),
    event.venue_name || event.location || event.city || "Location TBA",
  ].filter(Boolean);

  return `${parts.join(" | ")}. See who is going on Whozin.`;
}

function buildFallbackImageUrl(origin: string, event: InviteEvent | null): string {
  const url = new URL("/api/event-card", `${origin}/`);
  if (!event) return url.toString();

  if (event.title) url.searchParams.set("title", event.title);
  if (event.event_date) url.searchParams.set("date", formatEventDate(event.event_date));
  const location = event.venue_name || event.location || event.city || "";
  if (location) url.searchParams.set("location", location);
  return url.toString();
}

function buildInviteImageUrl(params: {
  origin: string;
  event: InviteEvent | null;
  inviterLabel: string;
  refToken: string;
}): string {
  const url = new URL("/api/event-card", `${params.origin}/`);
  url.searchParams.set("mode", "invite");
  url.searchParams.set("inviter", params.inviterLabel);
  if (params.refToken) url.searchParams.set("ref", params.refToken);

  if (params.event?.title) url.searchParams.set("title", params.event.title);
  if (params.event?.event_date) url.searchParams.set("date", formatEventDate(params.event.event_date));

  const location = params.event?.venue_name || params.event?.location || params.event?.city || "";
  if (location) url.searchParams.set("location", location);

  return url.toString();
}

async function fetchSupabaseRow<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SERVICE_ROLE_KEY?.trim() ||
    "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || "";
  const authKey = serviceRoleKey || anonKey;

  if (!baseUrl || !authKey) return null;

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: authKey,
      Authorization: `Bearer ${authKey}`,
    },
  });

  if (!response.ok) return null;

  const json = (await response.json()) as T[];
  return json[0] ?? null;
}

async function loadInviteProfile(handle: string): Promise<InviteProfile | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;
  const encoded = encodeURIComponent(cleanHandle);
  return fetchSupabaseRow<InviteProfile>(
    `profiles?select=username,display_name&username=eq.${encoded}&limit=1`
  );
}

async function loadEvent(eventId: string): Promise<InviteEvent | null> {
  if (!isUuid(eventId)) return null;
  const encoded = encodeURIComponent(eventId);
  const event = await fetchSupabaseRow<InviteEvent>(
    `events?select=id,title,location,city,venue_name,event_date,event_end_date,image_url,event_source,moderation_status&id=eq.${encoded}&limit=1`
  );
  return isEventVisible(event) ? event : null;
}

function renderHtml(params: {
  pageTitle: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  redirectUrl: string;
  headline: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(params.pageTitle)}</title>
    <meta name="description" content="${escapeHtml(params.description)}" />
    <link rel="canonical" href="${escapeHtml(params.canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Whozin" />
    <meta property="og:title" content="${escapeHtml(params.pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(params.description)}" />
    <meta property="og:url" content="${escapeHtml(params.canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(params.imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(params.imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Whozin event share preview" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(params.pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(params.description)}" />
    <meta name="twitter:image" content="${escapeHtml(params.imageUrl)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(params.redirectUrl)}" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(236, 72, 153, 0.28), transparent 32%),
          radial-gradient(circle at right, rgba(124, 58, 237, 0.24), transparent 28%),
          #050505;
        color: white;
        font-family: Inter, system-ui, sans-serif;
      }
      main {
        width: min(92vw, 34rem);
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(24, 24, 27, 0.82);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }
      .eyebrow {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: rgba(249, 168, 212, 0.92);
      }
      h1 {
        margin: 12px 0 8px;
        font-size: 28px;
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: rgba(228, 228, 231, 0.78);
        line-height: 1.5;
      }
      a {
        color: white;
      }
    </style>
    <script>
      window.location.replace(${JSON.stringify(params.redirectUrl)});
    </script>
  </head>
  <body>
    <main>
      <div class="eyebrow">Whozin invite</div>
      <h1>${escapeHtml(params.headline)}</h1>
      <p>${escapeHtml(params.body)}</p>
      <p style="margin-top: 16px;"><a href="${escapeHtml(params.redirectUrl)}">Continue to Whozin</a></p>
    </main>
  </body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = getOrigin(req);
  const handleParam = getSingle(req.query.handle).trim();
  const normalizedHandle = handleParam.startsWith("@") ? handleParam : `@${handleParam}`;
  const redirectUrl = new URL(`/add/${normalizedHandle}`, `${origin}/`);
  const previewUrl = new URL(`/share/${normalizedHandle}`, `${origin}/`);

  const source = getSingle(req.query.src).trim();
  const ref = getSingle(req.query.ref).trim();
  const eventId = getSingle(req.query.event).trim();

  if (source) redirectUrl.searchParams.set("src", source);
  if (ref) redirectUrl.searchParams.set("ref", ref);
  if (eventId) redirectUrl.searchParams.set("event", eventId);
  if (source) previewUrl.searchParams.set("src", source);
  if (ref) previewUrl.searchParams.set("ref", ref);
  if (eventId) previewUrl.searchParams.set("event", eventId);

  const [profile, event] = await Promise.all([
    loadInviteProfile(normalizedHandle),
    loadEvent(eventId),
  ]);

  const inviterLabel =
    profile?.display_name?.trim() || profile?.username?.trim() || normalizedHandle;
  const pageTitle = event?.title?.trim()
    ? `${event.title} | Whozin`
    : `${inviterLabel} invited you to Whozin`;
  const description = buildEventDescription(event, inviterLabel);
  const imageUrl = buildInviteImageUrl({
    origin,
    event,
    inviterLabel,
    refToken: ref,
  });
  const canonicalUrl = previewUrl.toString();
  const headline = event?.title?.trim() || `${inviterLabel} invited you`;
  const body = event
    ? `${inviterLabel} shared an event with you. Opening the invite now.`
    : `Opening ${inviterLabel}'s Whozin invite now.`;

  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.send(
    renderHtml({
      pageTitle,
      description,
      imageUrl,
      canonicalUrl,
      redirectUrl: redirectUrl.toString(),
      headline,
      body,
    })
  );
}
