import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Backend-Port wird über Env-Var gesteuert (Default 8000).
// Beispiel: EAM_API_PORT=8003 pnpm dev
const apiPort = process.env.EAM_API_PORT ?? "8000";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: mode === "public-player" ? "dist-public" : "dist",
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": `http://localhost:${apiPort}`,
    },
  },
}));
