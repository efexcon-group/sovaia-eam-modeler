import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: mode === "public-player" ? "dist-public" : "dist",
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://localhost:8000",
    },
  },
}));
