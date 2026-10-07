/**
 * Mock data dành riêng cho Admin module.
 * Bao gồm: stats tổng quan, doanh thu theo tháng, top sản phẩm,
 * recent orders, recent activity, danh sách orders của admin view,
 * danh sách users (admin perspective).
 *
 * Pattern: giống mock.ts — tách riêng để dễ refactor khi có backend thật.
 */

import {
  cars,
  parts,
  services,
  featuredGarages,
  mockUsers,
  type Order,
  type OrderStatus,
} from "./mock";

// =========================
// Stats tổng quan (KPI cards)
// =========================

export interface AdminKpi {
  id: string;
  label: string;
  value: string;
  /** % tăng/giảm so với kỳ trước (vd: 12.5 = +12.5%) */
  delta: number;
  /** Icon key để UI chọn icon phù hợp */
  icon: "revenue" | "orders" | "users" | "conversion";
  /** Màu accent */
  tone: "primary" | "accent" | "success" | "warning";
}

export const adminKpis: AdminKpi[] = [
  {
    id: "k1",
    label: "Doanh thu tháng này",
    value: "847,2tr",
    delta: 12.5,
    icon: "revenue",
    tone: "primary",
  },
  {
    id: "k2",
    label: "Đơn hàng mới",
    value: "1.247",
    delta: 8.2,
    icon: "orders",
    tone: "success",
  },
  {
    id: "k3",
    label: "Khách hàng hoạt động",
    value: "5.832",
    delta: -2.1,
    icon: "users",
    tone: "accent",
  },
  {
    id: "k4",
    label: "Tỉ lệ chuyển đổi",
    value: "3,84%",
    delta: 0.5,
    icon: "conversion",
    tone: "warning",
  },
];

// =========================
// Doanh thu 12 tháng gần nhất (chart data)
// =========================

export interface RevenuePoint {
  month: string; // VD: "T1", "T2"
  revenue: number; // triệu VND
  orders: number;
}

export const revenueData: RevenuePoint[] = [
  { month: "T11/25", revenue: 624, orders: 920 },
  { month: "T12/25", revenue: 712, orders: 1015 },
  { month: "T1/26", revenue: 658, orders: 980 },
  { month: "T2/26", revenue: 731, orders: 1092 },
  { month: "T3/26", revenue: 802, orders: 1180 },
  { month: "T4/26", revenue: 765, orders: 1124 },
  { month: "T5/26", revenue: 810, orders: 1192 },
  { month: "T6/26", revenue: 798, orders: 1170 },
  { month: "T7/26", revenue: 845, orders: 1232 },
  { month: "T8/26", revenue: 821, orders: 1201 },
  { month: "T9/26", revenue: 879, orders: 1284 },
  { month: "T10/26", revenue: 847, orders: 1247 },
];

// =========================
// Top products (parts) theo doanh thu
// =========================

export interface TopProduct {
  id: string;
  name: string;
  image: string;
  sold: number;
  revenue: number;
  growth: number; // % so với tháng trước
}

export const topParts: TopProduct[] = [
  {
    id: parts[0].id,
    name: parts[0].name,
    image: parts[0].image,
    sold: 487,
    revenue: parts[0].priceVND * 487,
    growth: 14.2,
  },
  {
    id: parts[2].id,
    name: parts[2].name,
    image: parts[2].image,
    sold: 612,
    revenue: parts[2].priceVND * 612,
    growth: 8.7,
  },
  {
    id: parts[7].id,
    name: parts[7].name,
    image: parts[7].image,
    sold: 198,
    revenue: parts[7].priceVND * 198,
    growth: 22.1,
  },
  {
    id: parts[1].id,
    name: parts[1].name,
    image: parts[1].image,
    sold: 342,
    revenue: parts[1].priceVND * 342,
    growth: -3.4,
  },
  {
    id: parts[4].id,
    name: parts[4].name,
    image: parts[4].image,
    sold: 156,
    revenue: parts[4].priceVND * 156,
    growth: 5.9,
  },
];

// =========================
// Top services theo số lượt booking
// =========================

export interface TopService {
  id: string;
  name: string;
  image: string;
  bookings: number;
  revenue: number;
  rating: number;
}

export const topServices: TopService[] = services
  .slice()
  .sort((a, b) => b.bookingsCount - a.bookingsCount)
  .slice(0, 5)
  .map((s) => ({
    id: s.id,
    name: s.name,
    image: s.image,
    bookings: s.bookingsCount,
    revenue: s.priceFrom * s.bookingsCount,
    rating: s.rating,
  }));

// =========================
// Recent activity (timeline)
// =========================

export type ActivityKind =
  | "order_created"
  | "order_completed"
  | "new_user"
  | "new_garage"
  | "service_booked"
  | "review_posted"
  | "garage_approved"
  | "low_stock";

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  actor: string;
  timestamp: string; // ISO date
  /** Color hint */
  tone: "primary" | "accent" | "success" | "warning" | "neutral";
}

export const recentActivities: Activity[] = [
  {
    id: "a1",
    kind: "order_created",
    title: "Đơn hàng mới #ORD-2026-0247",
    description: "Lốp Michelin Primacy 4 × 4 — 9,8tr",
    actor: "Nguyễn Văn A",
    timestamp: "2026-10-03T10:32:00Z",
    tone: "primary",
  },
  {
    id: "a2",
    kind: "service_booked",
    title: "Đặt lịch thay dầu",
    description: "Garage Minh Anh — 03/10 09:00",
    actor: "Trần Thị B",
    timestamp: "2026-10-03T09:45:00Z",
    tone: "accent",
  },
  {
    id: "a3",
    kind: "low_stock",
    title: "Cảnh báo tồn kho thấp",
    description: "Bộ lọc dầu Mahle OC195 — còn 12 sản phẩm",
    actor: "Hệ thống",
    timestamp: "2026-10-03T08:15:00Z",
    tone: "warning",
  },
  {
    id: "a4",
    kind: "new_garage",
    title: "Garage mới đăng ký",
    description: "Garage Hoàng Long — Hà Nội — chờ duyệt",
    actor: "Lê Văn C",
    timestamp: "2026-10-02T22:18:00Z",
    tone: "neutral",
  },
  {
    id: "a5",
    kind: "order_completed",
    title: "Hoàn tất đơn #ORD-2026-0239",
    description: "Bộ má phanh Brembo × 1 — 2,89tr",
    actor: "Phạm Văn Sỹ",
    timestamp: "2026-10-02T18:42:00Z",
    tone: "success",
  },
  {
    id: "a6",
    kind: "review_posted",
    title: "Đánh giá 5★ mới",
    description: "Bảo dưỡng định kỳ tại Garage Minh Anh",
    actor: "Hoàng Thị D",
    timestamp: "2026-10-02T16:30:00Z",
    tone: "accent",
  },
  {
    id: "a7",
    kind: "new_user",
    title: "Khách hàng mới đăng ký",
    description: "Đăng ký qua Google — Hà Nội",
    actor: "Đặng Văn E",
    timestamp: "2026-10-02T14:08:00Z",
    tone: "neutral",
  },
];

// =========================
// Recent orders (admin view)
// =========================

export interface AdminOrderRow {
  id: string;
  date: string; // DD/MM/YYYY
  customer: string;
  customerEmail: string;
  itemsCount: number;
  totalVND: number;
  status: OrderStatus;
  paymentMethod: "COD" | "Thẻ tín dụng" | "Chuyển khoản" | "Ví điện tử";
  city: string;
}

// Sinh danh sách orders giả lập từ mockUsers + mở rộng
const ADMIN_CUSTOMERS = [
  { name: "Nguyễn Văn A", email: "nguyenvana@example.com", city: "Hà Nội" },
  { name: "Trần Thị B", email: "tranthib@example.com", city: "TP.HCM" },
  { name: "Lê Văn C", email: "levanc@example.com", city: "Đà Nẵng" },
  { name: "Phạm Văn Sỹ", email: "phamsy@example.com", city: "Hà Nội" },
  { name: "Hoàng Thị D", email: "hoangthid@example.com", city: "TP.HCM" },
  { name: "Đặng Văn E", email: "dangvane@example.com", city: "Hải Phòng" },
  { name: "Vũ Thị F", email: "vuthif@example.com", city: "Cần Thơ" },
  { name: "Bùi Văn G", email: "buivang@example.com", city: "Bình Dương" },
  { name: "Đỗ Thị H", email: "dothih@example.com", city: "Đồng Nai" },
  { name: "Ngô Văn I", email: "ngovani@example.com", city: "Hà Nội" },
  { name: "Dương Thị K", email: "duongthik@example.com", city: "TP.HCM" },
  { name: "Lý Văn L", email: "lyvanl@example.com", city: "Đà Nẵng" },
];

const STATUS_LIST: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipping",
  "completed",
  "cancelled",
];

const PAYMENT_LIST: AdminOrderRow["paymentMethod"][] = [
  "COD",
  "Thẻ tín dụng",
  "Chuyển khoản",
  "Ví điện tử",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export const adminOrders: AdminOrderRow[] = Array.from({ length: 24 }).map(
  (_, idx) => {
    const customer = pick(ADMIN_CUSTOMERS, idx);
    const day = 30 - Math.floor(idx / 4);
    const date = `0${day <= 0 ? 1 : day}/${Math.max(9, 10 - Math.floor(idx / 12))}/2026`;
    return {
      id: `ORD-2026-${(250 - idx).toString().padStart(3, "0")}`,
      date,
      customer: customer.name,
      customerEmail: customer.email,
      itemsCount: (idx % 3) + 1,
      totalVND: 250_000 + ((idx * 173_421) % 8_500_000),
      status: pick(STATUS_LIST, idx + 1),
      paymentMethod: pick(PAYMENT_LIST, idx),
      city: customer.city,
    };
  },
);

// =========================
// Admin Users (extend từ mockUsers)
// =========================

export type AdminUserRole = "customer" | "garage_owner" | "admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: AdminUserRole;
  city: string;
  joinedAt: string;
  totalOrders: number;
  totalSpentVND: number;
  status: "active" | "suspended";
  /** Chỉ dùng cho role=garage_owner */
  garageName?: string;
}

const avatarSeeds = [
  "photo-1535713875002-d1d0cf377fde",
  "photo-1438761681033-6461ffad8d80",
  "photo-1500648767791-00dcc994a43e",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1494790108377-be9c29b29330",
];

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=200&q=70`;

export const adminUsers: AdminUser[] = [
  // user từ mockUsers
  ...mockUsers.map<AdminUser>((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatar: u.avatar,
    role: "customer",
    city: "Hà Nội",
    joinedAt: u.memberSince,
    totalOrders: u.orders.length,
    totalSpentVND: u.orders.reduce((s, o) => s + o.totalVND, 0),
    status: "active",
  })),
  // garage owners
  ...featuredGarages.map<AdminUser>((g) => ({
    id: g.id,
    name: g.name + " — Chủ garage",
    email: `owner@${g.slug}.vn`,
    phone: g.phone,
    avatar: IMG(avatarSeeds[parseInt(g.id.replace("g", "")) % avatarSeeds.length]),
    role: "garage_owner",
    city: g.city,
    joinedAt: "01/0" + (parseInt(g.id.replace("g", "")) + 4) + "/2025",
    totalOrders: g.reviewsCount,
    totalSpentVND: g.priceFrom * g.reviewsCount,
    status: g.openNow ? "active" : "active",
    garageName: g.name,
  })),
  // admin user (chính mình)
  {
    id: "admin1",
    name: "Admin AutoCare",
    email: "admin@autocare.vn",
    phone: "1900 6868",
    avatar: IMG(avatarSeeds[0]),
    role: "admin",
    city: "TP.HCM",
    joinedAt: "01/01/2024",
    totalOrders: 0,
    totalSpentVND: 0,
    status: "active",
  },
  // thêm customers mẫu
  ...ADMIN_CUSTOMERS.slice(0, 8).map<AdminUser>((c, idx) => ({
    id: `cu${idx + 100}`,
    name: c.name,
    email: c.email,
    phone: `09${(10000000 + idx * 1234567).toString().slice(0, 8)}`,
    avatar: IMG(avatarSeeds[idx % avatarSeeds.length]),
    role: "customer",
    city: c.city,
    joinedAt: `${10 + idx}/0${(idx % 9) + 1}/2026`,
    totalOrders: (idx % 5) + 1,
    totalSpentVND: 500_000 + idx * 1_250_000,
    status: idx === 7 ? "suspended" : "active",
  })),
];

// =========================
// Helpers
// =========================

export function formatKpiVND(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "shipping":
      return "Đang giao";
    case "completed":
      return "Hoàn tất";
    case "cancelled":
      return "Đã huỷ";
  }
}

export function getStatusTone(
  status: OrderStatus,
): "primary" | "accent" | "success" | "warning" | "danger" {
  switch (status) {
    case "pending":
      return "warning";
    case "confirmed":
      return "primary";
    case "shipping":
      return "accent";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
  }
}

export function getRoleLabel(role: AdminUserRole): string {
  switch (role) {
    case "customer":
      return "Khách hàng";
    case "garage_owner":
      return "Chủ garage";
    case "admin":
      return "Quản trị viên";
  }
}

export function relativeTime(iso: string): string {
  const now = new Date("2026-10-03T11:00:00Z").getTime();
  const t = new Date(iso).getTime();
  const diff = now - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

// =========================
// Re-exports — dùng cho admin pages
// =========================

export { cars, parts, services, featuredGarages, mockUsers };
export type { Order };