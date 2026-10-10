import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Dashboard is a static single-page app; it talks to the API from the browser
// (VITE_API_URL), so the API must list this app's origin in CORS_ORIGINS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "/src" resolves from the project root, in dev and in the build.
    alias: { "@": "/src" },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});
