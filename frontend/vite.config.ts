import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Mặc định: /api/* vào API Gateway (Spring Cloud) ở port 8000.
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
      // AI services chạy trực tiếp (không qua gateway) — frontend tự có
      // namespace riêng /ai/* rồi rewrite về /api/v1/* phía service.
      "/ai/chat": {
        target: process.env.VITE_AGENT_PROXY_TARGET ?? "http://localhost:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, "/api/v1"),
      },
      "/ai/detect": {
        target: process.env.VITE_DAMAGE_PROXY_TARGET ?? "http://localhost:8001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, "/api/v1"),
        // Multipart upload cần tăng buffer và timeout cho file lớn.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Connection", "keep-alive");
          });
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["access-control-allow-origin"] = "*";
          });
        },
      },
    },
  },
  preview: {
    port: 5173,
  },
});