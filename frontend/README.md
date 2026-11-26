# AutoCare — Frontend

Frontend cho **Automotive Service Platform** — React 18 + TypeScript + Vite + Tailwind CSS.

## Stack

- **React 18** + **TypeScript** (strict mode)
- **Vite 5** (dev server + build)
- **Tailwind CSS 3** với bảng màu cố định (`tailwind.config.js`)
- **React Router 6** cho routing
- Không state-management library ngoài (chỉ React built-in + `useReducer`)

## Cấu trúc thư mục

```
frontend/
├── api/                          # HTTP client tới Backend qua Gateway
│   └── client.ts                 # fetch wrapper, baseURL="", Authorization Bearer
├── components/                   # Shared UI (KHÔNG chứa API calls)
│   ├── icons.tsx
│   ├── Button.tsx / Card.tsx / Badge.tsx / Input.tsx
│   ├── Header.tsx / Footer.tsx
│   ├── Loading.tsx / Toast.tsx / ErrorBoundary.tsx
│   ├── AdminLayout.tsx / AdminTable.tsx
│   └── RecommendationWidget.tsx
├── data/                         # Mock data + localStorage stores (tạm thời)
│   ├── mock.ts                   # Garages, services, cars, parts, articles
│   ├── authStore.ts              # Local auth (sẽ thay bằng React Query + JWT)
│   ├── cartStore.ts              # Local cart
│   ├── recommend.ts              # Recommendation engine
│   └── adminMock.ts              # Mock data cho admin module
├── modules/                      # Pages theo domain (tách theo contracts/)
│   ├── auth/                     # auth-api.yaml
│   │   ├── Login.tsx
│   │   └── Profile.tsx
│   ├── commerce/                 # commerce-api.yaml + garage-api.yaml
│   │   ├── CarsList.tsx / CarDetail.tsx
│   │   ├── PartsList.tsx / PartDetail.tsx
│   │   ├── Cart.tsx / Checkout.tsx
│   │   └── ServicesList.tsx / ServiceDetail.tsx
│   ├── ai/                       # ai-api.yaml
│   │   ├── DamageUpload.tsx
│   │   └── ChatAssistant.tsx
│   ├── content/                  # content-api.yaml
│   │   ├── NewsList.tsx
│   │   └── ArticleDetail.tsx
│   └── admin/                    # Module quản trị (riêng layout)
│       ├── AdminDashboard.tsx / AdminGarages.tsx
│       ├── AdminServices.tsx / AdminParts.tsx
│       └── AdminOrders.tsx / AdminUsers.tsx
├── pages/                        # Shared pages (Home, demo)
│   ├── Home.tsx
│   ├── FoundationDemo.tsx
│   └── BoomDemo.tsx
├── styles/
│   └── globals.css               # Tailwind + tokens + animations
├── App.tsx                       # Shell chính (Header + Outlet + Footer)
├── main.tsx                      # Entry + routes
├── index.html
├── vite.config.ts                # Dev server + proxy /api -> Gateway
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## API Gateway — proxy qua Vite

Tất cả HTTP request tới backend đi qua `src/api/client.ts` (fetch wrapper), `baseURL = ""`.
Trong dev, Vite proxy chuyển `/api/*` → `http://localhost:4000` (Spring Cloud Gateway).

```ts
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    "/api": { target: "http://localhost:4000", changeOrigin: true },
  },
},
```

Ví dụ gọi API:

```ts
import { request } from "@/api/client";

// Gọi qua proxy → Gateway :4000 → /api/v1/auth/login
const data = await request("/api/v1/auth/login", {
  method: "POST",
  body: { email, password },
});
```

Client tự động gắn `Authorization: Bearer <token>` nếu user đã đăng nhập (đọc từ `localStorage["autocare:auth"]`).

## Cách chạy

```bash
# 1. Cài dependencies
npm install

# 2. Chạy dev server (port 5173)
npm run dev

# 3. Build production (output dist/)
npm run build

# 4. Preview bản build
npm run preview
```

**Yêu cầu**: Backend phải chạy ở `http://localhost:4000` (API Gateway) trước khi gọi API thật.

## Lưu ý quan trọng

- KHÔNG thêm dependencies mới (chỉ dùng React 18 + Vite 5 + Tailwind 3 + React Router 6).
- KHÔNG dùng Redux/Zustand/Jotai — chỉ React built-in + `useReducer`.
- TypeScript **strict mode** luôn bật (xem `tsconfig.json`).
- KHÔNG gọi `fetch()` trực tiếp — luôn qua `src/api/client.ts`.
- Tất cả page modules import theo đường dẫn tương đối `../../components/...`, `../../data/...`.