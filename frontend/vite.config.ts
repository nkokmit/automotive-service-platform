import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Proxy mọi request /api -> API Gateway (Spring Cloud)
    // Gateway đang chạy ở http://localhost:4000 và expose /v3/api-docs
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        // KHÔNG rewrite — Gateway đã có /api/v1/...
      },
    },
  },
  preview: {
    port: 5173,
  },
});