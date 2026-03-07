import { createRoot } from "react-dom/client";
import App from "@/app/App";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { initGlobalErrorTracking } from "@/lib/analytics";

import "@/styles/tailwind.css";
import "@/styles/theme.css";
import "@/styles/fonts.css";
import "@/styles/index.css";

initGlobalErrorTracking();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
