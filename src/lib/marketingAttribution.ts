import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "whozin_marketing_attribution_v1";
const MAX_TEXT_LENGTH = 512;
const MAX_URL_LENGTH = 2048;

export type StoredMarketingAttribution = {
  capturedAt: string;
  landingPath: string;
  landingUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
};

function clip(value: string | null | undefined, max = MAX_TEXT_LENGTH): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function safeUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString().slice(0, MAX_URL_LENGTH);
  } catch {
    return trimmed.slice(0, MAX_URL_LENGTH);
  }
}

function isSameOriginReferrer(referrer: string | null, origin: string): boolean {
  if (!referrer) return false;

  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}

export function parseStoredMarketingAttribution(
  currentUrl: URL,
  referrer: string | null | undefined
): StoredMarketingAttribution {
  const params = currentUrl.searchParams;
  const normalizedReferrer = safeUrl(referrer);

  return {
    capturedAt: new Date().toISOString(),
    landingPath: `${currentUrl.pathname}${currentUrl.search}`.slice(0, MAX_URL_LENGTH),
    landingUrl: currentUrl.toString().slice(0, MAX_URL_LENGTH),
    referrer: isSameOriginReferrer(normalizedReferrer, currentUrl.origin) ? null : normalizedReferrer,
    utmSource: clip(params.get("utm_source")),
    utmMedium: clip(params.get("utm_medium")),
    utmCampaign: clip(params.get("utm_campaign")),
    utmTerm: clip(params.get("utm_term")),
    utmContent: clip(params.get("utm_content")),
    fbclid: clip(params.get("fbclid")),
    gclid: clip(params.get("gclid")),
    ttclid: clip(params.get("ttclid")),
  };
}

export function hasMeaningfulMarketingAttribution(value: StoredMarketingAttribution | null): boolean {
  if (!value) return false;

  return Boolean(
    value.utmSource ||
      value.utmMedium ||
      value.utmCampaign ||
      value.utmTerm ||
      value.utmContent ||
      value.fbclid ||
      value.gclid ||
      value.ttclid ||
      value.referrer
  );
}

export function getStoredMarketingAttribution(): StoredMarketingAttribution | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMarketingAttribution | null;
    if (!parsed?.capturedAt || !parsed?.landingPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setStoredMarketingAttribution(value: StoredMarketingAttribution) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredMarketingAttribution() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function captureMarketingAttribution(): StoredMarketingAttribution | null {
  if (typeof window === "undefined") return null;

  const current = parseStoredMarketingAttribution(new URL(window.location.href), document.referrer);
  const existing = getStoredMarketingAttribution();

  if (!existing) {
    setStoredMarketingAttribution(current);
    return current;
  }

  if (!hasMeaningfulMarketingAttribution(existing) && hasMeaningfulMarketingAttribution(current)) {
    setStoredMarketingAttribution(current);
    return current;
  }

  return existing;
}

function isDuplicateInsert(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? "";
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return code === "23505" || message.includes("duplicate key");
}

export async function persistStoredMarketingAttribution(userId: string): Promise<boolean> {
  const stored = getStoredMarketingAttribution();
  if (!stored) return false;

  const { error } = await supabase.from("user_acquisition_attribution").insert({
    user_id: userId,
    captured_at: stored.capturedAt,
    landing_path: stored.landingPath,
    landing_url: stored.landingUrl,
    referrer: stored.referrer,
    utm_source: stored.utmSource,
    utm_medium: stored.utmMedium,
    utm_campaign: stored.utmCampaign,
    utm_term: stored.utmTerm,
    utm_content: stored.utmContent,
    fbclid: stored.fbclid,
    gclid: stored.gclid,
    ttclid: stored.ttclid,
    metadata: {
      captured_at: stored.capturedAt,
    },
  });

  if (error && !isDuplicateInsert(error)) {
    throw error;
  }

  clearStoredMarketingAttribution();
  return !error;
}
