import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Mọi request /api -> API Gateway (Spring Cloud) mà Gateway đang chạy ở port 8000.
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
        // KHÔNG rewrite — Gateway giữ nguyên prefix /api khi forward xuống service.
      },
    },
  },
  preview: {
    port: 5173,
  },
});