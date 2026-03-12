type VercelRequest = {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

type EventRow = {
  id: string;
  title: string | null;
  location: string | null;
  city: string | null;
  venue_name: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description: string | null;
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

function isEventVisible(event: EventRow | null): boolean {
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

function summarizeDescription(event: EventRow | null): string {
  if (!event) {
    return "See who's going before you go on Whozin.";
  }

  const details = [
    formatEventDate(event.event_date),
    event.venue_name || event.location || event.city || "Location TBA",
  ].filter(Boolean);
  const base = event.description?.trim() || details.join(" | ");
  const clipped = base.length > 155 ? `${base.slice(0, 152).trimEnd()}...` : base;
  return clipped || "See who's going before you go on Whozin.";
}

function buildFallbackImageUrl(origin: string, event: EventRow | null): string {
  const url = new URL("/api/event-card", `${origin}/`);
  if (!event) return url.toString();

  if (event.title) url.searchParams.set("title", event.title);
  if (event.event_date) url.searchParams.set("date", formatEventDate(event.event_date));
  const location = event.venue_name || event.location || event.city || "";
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

async function loadEvent(eventId: string): Promise<EventRow | null> {
  if (!isUuid(eventId)) return null;
  const encoded = encodeURIComponent(eventId);
  const event = await fetchSupabaseRow<EventRow>(
    `events?select=id,title,location,city,venue_name,event_date,event_end_date,image_url,description,event_source,moderation_status&id=eq.${encoded}&limit=1`
  );
  return isEventVisible(event) ? event : null;
}

function renderHtml(params: {
  pageTitle: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  redirectUrl: string;
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
    <meta property="og:image:alt" content="Whozin event preview" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(params.pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(params.description)}" />
    <meta name="twitter:image" content="${escapeHtml(params.imageUrl)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(params.redirectUrl)}" />
    <script>
      window.location.replace(${JSON.stringify(params.redirectUrl)});
    </script>
  </head>
  <body style="margin:0;background:#050505;color:white;font-family:Inter,system-ui,sans-serif;display:grid;min-height:100vh;place-items:center;">
    <div style="padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(24,24,27,.82);max-width:32rem;">
      Opening event...
    </div>
  </body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = getOrigin(req);
  const eventId = getSingle(req.query.id).trim();
  const src = getSingle(req.query.src).trim();
  const onboarding = getSingle(req.query.onboarding).trim();
  const event = await loadEvent(eventId);

  const canonicalUrl = new URL(`/event/${eventId}`, `${origin}/`);
  const redirectUrl = new URL(`/open/event/${eventId}`, `${origin}/`);
  if (src) {
    canonicalUrl.searchParams.set("src", src);
    redirectUrl.searchParams.set("src", src);
  }
  if (onboarding) {
    canonicalUrl.searchParams.set("onboarding", onboarding);
    redirectUrl.searchParams.set("onboarding", onboarding);
  }

  const pageTitle = event?.title?.trim() ? `${event.title} | Whozin` : "Whozin event";
  const description = summarizeDescription(event);
  const imageUrl = event?.image_url?.trim() || buildFallbackImageUrl(origin, event);

  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.send(
    renderHtml({
      pageTitle,
      description,
      imageUrl,
      canonicalUrl: canonicalUrl.toString(),
      redirectUrl: redirectUrl.toString(),
    })
  );
}
