import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("src/app/desktop/")) return "desktop-shell";
          if (id.includes("node_modules/@supabase/")) return "vendor-supabase";
          if (id.includes("node_modules/react-router") || id.includes("node_modules/react-router-dom")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/@radix-ui/")) return "vendor-radix";
          if (id.includes("node_modules/react-day-picker") || id.includes("node_modules/date-fns")) {
            return "vendor-dates";
          }
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/@mui/") ||
            id.includes("node_modules/@emotion/")
          ) {
            return "vendor-ui-heavy";
          }
          if (id.includes("node_modules/@sentry/") || id.includes("node_modules/posthog-js")) {
            return "vendor-monitoring";
          }
          return undefined;
        },
      },
    },
  },
});
