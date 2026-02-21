type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props: AnalyticsProps = {}) {
  const payload = { event, ...props };

  try {
    const w = window as any;

    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(payload);
    }

    if (typeof w.gtag === "function") {
      w.gtag("event", event, props);
    }

    if (typeof w.plausible === "function") {
      w.plausible(event, { props });
    }

    if (w.posthog?.capture) {
      w.posthog.capture(event, props);
    }
  } catch {
    // Never block product flow on analytics failure.
  }

  if (import.meta.env.DEV) {
    // Lightweight local visibility during seed testing.
    console.info("[analytics]", payload);
  }
}
