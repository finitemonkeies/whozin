type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type QueuedAnalyticsEvent =
  | { type: "track"; event: string; props: AnalyticsProps }
  | {
      type: "identify";
      userId: string;
      props: Record<string, string>;
    }
  | { type: "reset" };

declare global {
  interface Window {
    __whozinMonitoringInit?: boolean;
    __whozinAnalyticsQueue?: QueuedAnalyticsEvent[];
    posthog?: {
      capture?: (event: string, props?: AnalyticsProps) => void;
      identify?: (userId: string, props?: Record<string, string>) => void;
      reset?: () => void;
      get_distinct_id?: () => string;
    };
  }
}

function getAnalyticsQueue() {
  if (typeof window === "undefined") return [];
  window.__whozinAnalyticsQueue ??= [];
  return window.__whozinAnalyticsQueue;
}

export function queueAnalyticsEvent(event: QueuedAnalyticsEvent) {
  if (typeof window === "undefined") return;
  getAnalyticsQueue().push(event);
}

function flushAnalyticsQueue() {
  if (typeof window === "undefined") return;
  const queue = getAnalyticsQueue();
  const posthog = window.posthog;
  if (!posthog || queue.length === 0) return;

  for (const item of [...queue]) {
    if (item.type === "track") {
      posthog.capture?.(item.event, item.props);
    } else if (item.type === "identify") {
      posthog.identify?.(item.userId, item.props);
    } else if (item.type === "reset") {
      posthog.reset?.();
    }
  }

  queue.length = 0;
}

export function initMonitoring() {
  if (typeof window === "undefined" || window.__whozinMonitoringInit) return;
  window.__whozinMonitoringInit = true;

  const start = async () => {
    const sentryDsn =
      (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() ||
      "https://6de6cf8836c81d53fd90f42f3dbd5bcc@o4511020304826368.ingest.us.sentry.io/4511020313739264";

    if (sentryDsn) {
      const Sentry = await import("@sentry/react");
      Sentry.init({
        dsn: sentryDsn,
        sendDefaultPii: true,
      });
    }

    const posthogKey = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim();
    const posthogHost =
      (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() || "https://us.i.posthog.com";
    const posthogUiHost =
      (import.meta.env.VITE_POSTHOG_UI_HOST as string | undefined)?.trim() ||
      (posthogHost.includes("eu.i.posthog.com") ? "https://eu.posthog.com" : "https://us.posthog.com");
    const posthogDebug =
      ((import.meta.env.VITE_POSTHOG_DEBUG as string | undefined)?.trim() || "").toLowerCase() === "true";

    if (posthogKey) {
      const posthogModule = await import("posthog-js");
      const posthog = posthogModule.default;

      posthog.init(posthogKey, {
        api_host: posthogHost,
        ui_host: posthogUiHost,
        capture_pageview: true,
        autocapture: true,
        advanced_disable_feature_flags: true,
        disable_external_dependency_loading: true,
        request_batching: false,
        loaded: (instance) => {
          window.posthog = instance;
          flushAnalyticsQueue();

          if (import.meta.env.DEV || posthogDebug) {
            console.info("[posthog] initialized", {
              apiHost: posthogHost,
              uiHost: posthogUiHost,
              distinctId: instance.get_distinct_id?.(),
            });
          }

          instance.capture?.("app_loaded", {
            mode: import.meta.env.MODE,
            host: window.location.host,
            pathname: window.location.pathname,
          });
        },
      });

      window.posthog = posthog;
      flushAnalyticsQueue();
    } else if (import.meta.env.DEV) {
      console.warn("[posthog] skipped: VITE_POSTHOG_KEY is not set");
    }
  };

  const idleCapableWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (typeof idleCapableWindow.requestIdleCallback === "function") {
    idleCapableWindow.requestIdleCallback(() => {
      void start();
    }, { timeout: 2500 });
    return;
  }

  window.setTimeout(() => {
    void start();
  }, 1200);
}
