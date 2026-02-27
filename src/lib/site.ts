const configuredSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();

export function getSiteOrigin(): string {
  if (configuredSiteUrl) {
    try {
      return new URL(configuredSiteUrl).origin;
    } catch {
      // Fall back to runtime origin if env value is malformed.
    }
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "https://whozin.app";
}

export function buildSiteUrl(pathname: string): string {
  const base = getSiteOrigin();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, `${base}/`).toString();
}
