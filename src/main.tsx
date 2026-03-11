import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import App from "@/app/App";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { initGlobalErrorTracking } from "@/lib/analytics";

import "@/styles/tailwind.css";
import "@/styles/theme.css";
import "@/styles/fonts.css";
import "@/styles/index.css";

const sentryDsn =
  (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() ||
  "https://6de6cf8836c81d53fd90f42f3dbd5bcc@o4511020304826368.ingest.us.sentry.io/4511020313739264";

if (sentryDsn) {
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
  posthog.init(posthogKey, {
    api_host: posthogHost,
    ui_host: posthogUiHost,
    capture_pageview: true,
    autocapture: true,
    advanced_disable_feature_flags: true,
    disable_external_dependency_loading: true,
    loaded: (instance) => {
      (window as any).posthog = instance;

      if (import.meta.env.DEV || posthogDebug) {
        console.info("[posthog] initialized", {
          apiHost: posthogHost,
          uiHost: posthogUiHost,
          distinctId: instance.get_distinct_id(),
        });
      }

      instance.capture("app_loaded", {
        mode: import.meta.env.MODE,
        host: window.location.host,
        pathname: window.location.pathname,
      });
    },
  });
  (window as any).posthog = posthog;
} else if (import.meta.env.DEV) {
  console.warn("[posthog] skipped: VITE_POSTHOG_KEY is not set");
}

initGlobalErrorTracking();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
