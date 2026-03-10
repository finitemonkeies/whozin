import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
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

initGlobalErrorTracking();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
