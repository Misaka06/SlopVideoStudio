import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  build: { outDir: "../dist/web", emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  server: { port: 5173, proxy: { "/api": "http://localhost:4000", "/media": "http://localhost:4000", "/assets": "http://localhost:4000" } },
});
