type MaybeVisibleEvent = {
  event_source?: string | null;
  moderation_status?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
};

const surfaceIngestedSources =
  (import.meta.env.VITE_SURFACE_INGESTED_SOURCES as string | undefined) === "true";

const hiddenSources = new Set(["ra", "ticketmaster_artist", "ticketmaster_nearby", "eventbrite"]);

export type SurfaceTier = "curated" | "support" | "long_tail";

export function getSurfaceTier(source: string | null | undefined): SurfaceTier {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized || normalized === "internal") return "curated";
  if (normalized === "shotgun" || normalized === "19hz") return "support";
  return "long_tail";
}

export function getSurfacePriority(source: string | null | undefined): number {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized || normalized === "internal") return 4;
  if (normalized === "shotgun") return 2;
  if (normalized === "19hz") return 1;
  return 0;
}

export function canSurfaceSource(source: string | null | undefined): boolean {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized) return true;
  if (!hiddenSources.has(normalized)) return true;
  return surfaceIngestedSources;
}

export function isEventVisible(event: MaybeVisibleEvent | null | undefined): boolean {
  if (!event) return false;
  const moderationStatus = (event.moderation_status ?? "").trim().toLowerCase();
  if (moderationStatus === "quarantined" || moderationStatus === "hidden") return false;
  return canSurfaceSource(event.event_source);
}

export function shouldSurfaceOnPrimaryFeeds(event: MaybeVisibleEvent | null | undefined): boolean {
  if (!isEventVisible(event)) return false;
  const tier = getSurfaceTier(event?.event_source);
  if (tier === "curated") return true;
  if (tier === "long_tail") return false;

  const hasImage = !!event?.image_url?.trim();
  const hasTicket = !!event?.ticket_url?.trim();
  return hasImage || hasTicket;
}

export function sourceLabel(source: string | null | undefined): string {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized || normalized === "internal") return "Whozin";
  if (normalized === "19hz") return "19hz";
  if (normalized === "ra") return "Resident Advisor";
  if (normalized.startsWith("ticketmaster")) return "Ticketmaster";
  if (normalized === "eventbrite") return "Eventbrite";
  return normalized
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
