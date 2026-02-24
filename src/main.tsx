import { createRoot } from "react-dom/client";
import App from "@/app/App";
import { AuthProvider } from "@/app/providers/AuthProvider";

import "@/styles/tailwind.css";
import "@/styles/theme.css";
import "@/styles/fonts.css";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
