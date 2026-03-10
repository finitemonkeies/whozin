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

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: true,
  });
  (window as any).posthog = posthog;
}

initGlobalErrorTracking();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
