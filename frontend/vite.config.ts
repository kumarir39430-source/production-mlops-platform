import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser calls "/api/..."; Vite forwards it to the FastAPI service with the "/api" prefix
// removed (the model API serves /health, /ready, /predict ... at its root).
// Locally the API is on 127.0.0.1:8000; in Docker Compose it is http://api:8000.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
