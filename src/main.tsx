import { createRoot } from "react-dom/client";
import App from "@/app/App";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { initGlobalErrorTracking } from "@/lib/analytics";

import "@/styles/tailwind.css";
import "@/styles/theme.css";
import "@/styles/fonts.css";
import "@/styles/index.css";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

function runInBackground(task: () => void) {
  if (typeof window === "undefined") return;

  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(task, { timeout: 2500 });
    return;
  }

  window.setTimeout(task, 1200);
}

initGlobalErrorTracking();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

runInBackground(() => {
  void import("@/lib/monitoring").then(({ initMonitoring }) => {
    initMonitoring();
  });
});

runInBackground(() => {
  void import("@/lib/pushNotifications").then(({ registerPushServiceWorker }) => {
    void registerPushServiceWorker();
  });
});
