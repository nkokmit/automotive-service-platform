# AutoCare — Frontend Mockups

Prototype giao diện 6 trang chính của dự án **Automotive Service Platform**.

## Mục đích

- Trực quan hoá giao diện trước khi chốt stack chính thức (Next.js hay React + Vite)
- Demo trước nhóm trưởng và giảng viên
- Làm cơ sở để port sang dự án thật trong `frontend/`

## Stack

- **React 18** + **TypeScript**
- **Vite 5** (dev server + build)
- **Tailwind CSS 3** với **bảng màu cố định** (xem `tailwind.config.js`)
- **React Router 6** cho routing
- Font: **Inter** (Google Fonts)

## Bảng màu (yêu cầu của nhóm)

| Token | Hex | Dùng cho |
|---|---|---|
| `primary` | `#1D4533` | Header, button chính, text quan trọng |
| `accent` | `#F9D2BA` | Badge, hover, highlight |
| `bgsoft` | `#F7EAE0` | Background phụ, card lớn |
| `ink` | `#5E3122` | Body text, border |

## 6 trang MVP

| Route | Trang | File |
|---|---|---|
| `/` | Trang chủ | `src/pages/Home.tsx` |
| `/login` | Đăng nhập / Đăng ký | `src/pages/Login.tsx` |
| `/garages` | Danh sách garage | `src/pages/GarageList.tsx` |
| `/garages/:slug` | Chi tiết + đặt lịch | `src/pages/GarageDetail.tsx` |
| `/ai/damage` | Upload ảnh (AI) | `src/pages/DamageUpload.tsx` |
| `/ai/assistant` | Chat AI | `src/pages/ChatAssistant.tsx` |

## Cách chạy

```bash
cd docs/mockups
npm install
npm run dev
```

Mở http://localhost:5173

## Responsive

- ✅ Mobile (<640px) — header collapse thành menu hamburger
- ✅ Tablet (640-1024px)
- ✅ Desktop (>1024px) — booking widget sticky

## Ghi chú

- Đây là **prototype**, KHÔNG kết nối API thật. Dữ liệu mock trong `src/data/mock.ts`
- Khi nhóm trưởng chốt stack chính thức:
  - **Next.js** → port sang `frontend/` với App Router, bỏ `BrowserRouter`
  - **Vite + React** → đổi tên `docs/mockups/` thành `frontend/`, giữ nguyên code