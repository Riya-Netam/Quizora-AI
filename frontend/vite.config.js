import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks to Vite, and Vite forwards /api to FastAPI.
    // That keeps cookies first-party, exactly like the production setup on Vercel.
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: false,
  },
});
