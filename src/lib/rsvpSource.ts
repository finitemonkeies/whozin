const ALLOWED_RSVP_SOURCES = new Set([
  "home",
  "event_details",
  "explore",
  "profile",
  "feed_friend",
  "share_link",
  "rsvp_share",
  "profile_share",
  "event_detail_share",
  "invite_link",
  "unknown",
]);

export function sanitizeRsvpSource(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  return ALLOWED_RSVP_SOURCES.has(normalized) ? normalized : "unknown";
}

export function getRsvpSourceFromSearch(search: string | null | undefined): string {
  const params = new URLSearchParams(search ?? "");
  return sanitizeRsvpSource(params.get("src"));
}
