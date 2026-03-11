import { supabase } from "@/lib/supabase";

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;
type AnalyticsUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  provider?: string | null;
};

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

export function identifyAnalyticsUser(user: AnalyticsUser) {
  try {
    const w = window as any;
    if (!w.posthog?.identify) return;

    const props = Object.fromEntries(
      Object.entries({
        email: user.email ?? undefined,
        username: user.username ?? undefined,
        provider: user.provider ?? undefined,
      }).filter(([, value]) => typeof value === "string" && value.length > 0)
    );

    w.posthog.identify(user.id, props);
  } catch {
    // Never block product flow on analytics failure.
  }
}

export function resetAnalyticsUser() {
  try {
    const w = window as any;
    w.posthog?.reset?.();
  } catch {
    // Never block product flow on analytics failure.
  }
}

function normalizeErrorLike(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || "Unknown error",
      stack: err.stack ? err.stack.slice(0, 1000) : undefined,
    };
  }
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err).slice(0, 1000) };
  } catch {
    return { message: "Unknown error" };
  }
}

export function trackError(kind: string, err: unknown, extra: AnalyticsProps = {}) {
  const normalized = normalizeErrorLike(err);
  const context = Object.fromEntries(
    Object.entries(extra).filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value) || value == null
    )
  );
  track("client_error", {
    kind,
    message: normalized.message,
    stack: normalized.stack,
    ...extra,
  });
  void supabase
    .rpc("log_client_error", {
      p_kind: kind,
      p_message: normalized.message,
      p_stack: normalized.stack ?? null,
      p_context: context,
    })
    .then(() => null)
    .catch(() => null);
}

export function initGlobalErrorTracking() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __whozinErrorTrackingInit?: boolean };
  if (w.__whozinErrorTrackingInit) return;
  w.__whozinErrorTrackingInit = true;

  window.addEventListener("error", (event) => {
    trackError("window_error", event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackError("unhandled_rejection", event.reason);
  });
}
