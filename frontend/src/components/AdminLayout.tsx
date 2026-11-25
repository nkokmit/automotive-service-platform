import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  IconDashboard,
  IconBuilding,
  IconWrench,
  IconPackage,
  IconUsers,
  IconChart,
  IconSettings,
  IconBell,
  IconSearch,
  IconMenu,
  IconClose,
  IconArrowLeft,
  IconCar,
  IconLogout,
  IconCheck,
  IconWarning,
  IconActivity,
  IconCalendar,
  IconCash,
  IconShield,
  IconTruck,
  IconList,
} from "./icons";
import { useAuth } from "../data/authStore";
import { roleLabel } from "../api/types";
import { useToast } from "./Toast";
import SearchBox from "./SearchBox";
import { recentActivities } from "../data/adminMock";

// =========================
// AdminLayout — shell chung cho /admin/*
// Gồm sidebar trái (240px) + topbar trên + content area.
// =========================

interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

const navGroups: NavGroup[] = [
  {
    items: [
      { to: "/admin", label: "Dashboard", icon: IconDashboard },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { to: "/admin/bookings", label: "Lịch hẹn xưởng", icon: IconCalendar },
      { to: "/admin/invoices", label: "Hóa đơn", icon: IconCash },
      { to: "/admin/work-orders", label: "Phiếu sửa chữa", icon: IconWrench },
      {
        to: "/admin/work-orders/mine",
        label: "Việc của tôi",
        icon: IconCheck,
      },
      { to: "/admin/staff", label: "Kỹ thuật viên", icon: IconUsers },
      { to: "/admin/vehicles", label: "Hồ sơ Xe & KH", icon: IconCar },
      { to: "/admin/parts", label: "Phụ tùng", icon: IconPackage },
      { to: "/admin/suppliers", label: "Nhà cung cấp", icon: IconBuilding },
      {
        to: "/admin/purchase-orders",
        label: "Đơn nhập hàng",
        icon: IconTruck,
      },
      {
        to: "/admin/inventory-transactions",
        label: "Sổ kho",
        icon: IconActivity,
      },
      { to: "/admin/services", label: "Dịch vụ", icon: IconWrench },
      { to: "/admin/categories", label: "Nhóm danh mục", icon: IconList },
      { to: "/admin/garage", label: "Hồ sơ xưởng", icon: IconBuilding },
      { to: "/admin/users", label: "Người dùng", icon: IconUsers },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { to: "/admin/permissions", label: "Quyền", icon: IconShield },
      { to: "/admin/roles", label: "Vai trò", icon: IconShield },
      { to: "/admin/reports", label: "Báo cáo", icon: IconChart },
      { to: "/admin/settings", label: "Cài đặt", icon: IconSettings },
    ],
  },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useToast();

  // Panel thông báo
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifications]);

  const unreadCount = recentActivities.filter(
    (a) => !readIds.includes(a.id),
  ).length;

  // Ô tìm kiếm admin: điều hướng tới trang phù hợp dựa trên từ khoá.
  //
  // Lưu ý: từ khoá chỉ mang tính "định tuyến" (ví dụ "phụ tùng" → trang phụ tùng).
  // Ta bỏ chính từ khoá định tuyến ra khỏi chuỗi lọc để bảng không bị lọc rỗng
  // (tìm "phụ tùng" trong danh sách phụ tùng sẽ không ra dòng nào).
  const ADMIN_ROUTES: {
    match: RegExp;
    to: string;
    /** Các từ khoá chỉ dùng để định tuyến — không đưa vào bộ lọc của bảng. */
    routeWords: string[];
  }[] = [
    {
      match: /lịch hẹn|booking|hẹn/,
      to: "/admin/bookings",
      routeWords: ["lịch hẹn", "lịch", "booking", "bookings", "hẹn"],
    },
    {
      match: /hóa đơn|invoice|bill/,
      to: "/admin/invoices",
      routeWords: ["hóa đơn", "invoice", "invoices"],
    },
    {
      match: /phiếu|work.?order/,
      to: "/admin/work-orders",
      routeWords: ["phiếu", "work order", "work-orders"],
    },
    {
      match: /xe|vehicle|khách|customer/,
      to: "/admin/vehicles",
      routeWords: ["xe", "xe của khách", "vehicle", "khách", "khách hàng", "customer"],
    },
    {
      // "kho" chỉ dùng khi đi kèm "tồn"/"số lượng" — nếu để đứng độc lập
      // thì cụm "sổ kho" sẽ bị kéo về trang phụ tùng.
      match: /phụ tùng|phụ kiện|part|tồn kho|số lượng tồn/,
      to: "/admin/parts",
      routeWords: [
        "phụ tùng",
        "phụ kiện",
        "part",
        "parts",
        "tồn kho",
        "số lượng tồn",
      ],
    },
    {
      match: /nhà cung cấp|ncc|supplier|nguồn hàng/,
      to: "/admin/suppliers",
      routeWords: [
        "nhà cung cấp",
        "ncc",
        "supplier",
        "suppliers",
        "nguồn hàng",
      ],
    },
    {
      match: /đơn nhập hàng|đơn hàng|nhập hàng|purchase/,
      to: "/admin/purchase-orders",
      routeWords: [
        "đơn nhập hàng",
        "đơn hàng",
        "nhập hàng",
        "purchase",
        "purchase-orders",
      ],
    },
    {
      match: /sổ kho|nhật ký|giao dịch kho|transaction/,
      to: "/admin/inventory-transactions",
      routeWords: [
        "sổ kho",
        "sổ",
        "nhật ký",
        "giao dịch kho",
        "transaction",
        "transactions",
      ],
    },
    {
      match: /dịch vụ|service/,
      to: "/admin/services",
      routeWords: ["dịch vụ", "service", "services"],
    },
    {
      match: /người dùng|user|tài khoản/,
      to: "/admin/users",
      routeWords: ["người dùng", "user", "users", "tài khoản"],
    },
    {
      match: /quyền|permission|phân quyền/,
      to: "/admin/permissions",
      routeWords: ["quyền", "quyen", "permission", "permissions", "phân quyền"],
    },
    {
      match: /vai trò|role/,
      to: "/admin/roles",
      routeWords: ["vai trò", "vai tro", "role", "roles"],
    },
  ];

  const handleAdminSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const route = ADMIN_ROUTES.find((r) => r.match.test(q));
    if (!route) {
      navigate(`/admin/bookings?q=${encodeURIComponent(query)}`);
      t.info(
        `Không xác định "${query}" thuộc mục nào — đang tìm trong danh sách lịch hẹn.`,
      );
      return;
    }

    // Cắt bỏ các từ khoá chỉ dùng để định tuyến, phần còn lại mới lọc bảng.
    let filter = q;
    for (const w of route.routeWords) {
      filter = filter.split(w).join(" ");
    }
    filter = filter.replace(/\s+/g, " ").trim();

    navigate(
      filter
        ? `${route.to}?q=${encodeURIComponent(filter)}`
        : route.to,
    );
  };

  return (
    <div className="min-h-screen bg-bgsoft/50 flex">
      {/* ============= SIDEBAR (desktop) ============= */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-ink/8 sticky top-0 h-screen">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* ============= SIDEBAR (mobile drawer) ============= */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-ink/50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ============= MAIN ============= */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink/8 h-16 flex items-center gap-3 px-4 lg:px-6">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-bgsoft"
            aria-label="Mở menu"
          >
            <IconMenu size={20} />
          </button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBox
              className="w-full"
              placeholder="Tìm lịch hẹn, khách hàng, dịch vụ..."
              shortcut
              onNavigate={handleAdminSearch}
            />
          </div>

          <div className="flex-1 md:flex-none" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary px-2 py-1.5 rounded-lg hover:bg-bgsoft"
              title="Về trang khách hàng"
            >
              <IconArrowLeft size={14} />
              <span className="hidden md:inline">Trang khách hàng</span>
            </Link>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-lg hover:bg-bgsoft text-ink-muted hover:text-ink"
                aria-label="Thông báo"
                aria-expanded={showNotifications}
                aria-haspopup="menu"
              >
                <IconBell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-cardHover border border-ink/10 z-40 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-ink/8">
                    <span className="font-semibold text-sm">Thông báo</span>
                    <button
                      onClick={() => setReadIds(recentActivities.map((a) => a.id))}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>

                  <ul className="max-h-80 overflow-y-auto divide-y divide-ink/5">
                    {recentActivities.map((a) => {
                      const unread = !readIds.includes(a.id);
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() =>
                              setReadIds((prev) =>
                                prev.includes(a.id) ? prev : [...prev, a.id],
                              )
                            }
                            className={[
                              "w-full text-left px-4 py-3 hover:bg-bgsoft transition-colors",
                              unread ? "bg-primary/5" : "",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={[
                                  "mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                                  a.tone === "warning"
                                    ? "bg-amber-100 text-amber-700"
                                    : a.tone === "success"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-primary/10 text-primary",
                                ].join(" ")}
                              >
                                {a.kind === "low_stock" ? (
                                  <IconWarning size={13} />
                                ) : a.kind === "new_user" ? (
                                  <IconUsers size={13} />
                                ) : (
                                  <IconActivity size={13} />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-ink line-clamp-1">
                                  {a.title}
                                </div>
                                <div className="text-xs text-ink-muted line-clamp-1">
                                  {a.description}
                                </div>
                              </div>
                              {unread && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="px-4 py-2 border-t border-ink/8">
                    <Link
                      to="/admin"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Xem tất cả hoạt động
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-ink/10">
              <img
                src={
                  user?.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=70"
                }
                alt={user?.name || "Admin"}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
              />
              <div className="hidden sm:block min-w-0">
                <div className="text-sm font-semibold truncate max-w-[120px]">
                  {user?.name || "Admin AutoCare"}
                </div>
                <div className="text-[10px] text-primary font-medium uppercase">
                  {roleLabel(user?.roles)}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// =========================
// Sidebar content
// =========================

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-ink/8 shrink-0">
        <Link
          to="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 font-bold text-base"
        >
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center">
            <IconCar size={18} />
          </span>
          <div className="leading-tight">
            <div>AutoCare</div>
            <div className="text-[10px] font-medium text-primary uppercase tracking-wider">
              Admin Panel
            </div>
          </div>
        </Link>
        <button
          onClick={onNavigate}
          className="lg:hidden p-1.5 rounded-md hover:bg-bgsoft"
          aria-label="Đóng menu"
        >
          <IconClose size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 px-2">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={
                      item.to === "/admin" ||
                      // Route con của "Phiếu sửa chữa" — `end` để trang cha
                      // không bị highlight khi đang ở trang con.
                      item.to === "/admin/work-orders" ||
                      item.to === "/admin/work-orders/mine"
                    }
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors group",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-ink hover:bg-bgsoft",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={16}
                          className={
                            isActive ? "text-primary" : "text-ink-muted group-hover:text-ink"
                          }
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={[
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                              isActive
                                ? "bg-primary text-white"
                                : "bg-bgsoft text-ink-muted",
                            ].join(" ")}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: log out */}
      <div className="p-3 border-t border-ink/8 shrink-0">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-light hover:bg-bgsoft hover:text-ink"
        >
          <IconLogout size={16} />
          <span>Đăng xuất</span>
        </Link>
        <div className="text-[10px] text-ink-muted text-center mt-2">
          v0.1.0 · © 2026 AutoCare
        </div>
      </div>
    </>
  );
}
