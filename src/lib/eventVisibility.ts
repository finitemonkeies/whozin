type MaybeVisibleEvent = {
  event_source?: string | null;
  moderation_status?: string | null;
};

const surfaceIngestedSources =
  (import.meta.env.VITE_SURFACE_INGESTED_SOURCES as string | undefined) === "true";

const hiddenSources = new Set(["ra", "ticketmaster_artist", "ticketmaster_nearby", "eventbrite"]);

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

