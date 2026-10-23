import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  IconDashboard,
  IconBuilding,
  IconWrench,
  IconPackage,
  IconShoppingBag,
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
} from "./icons";
import { useAuth } from "../data/authStore";

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
      { to: "/admin/orders", label: "Đơn hàng", icon: IconShoppingBag, badge: "24" },
      { to: "/admin/parts", label: "Phụ tùng", icon: IconPackage },
      { to: "/admin/services", label: "Dịch vụ", icon: IconWrench },
      { to: "/admin/garages", label: "Garage", icon: IconBuilding },
      { to: "/admin/users", label: "Người dùng", icon: IconUsers },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { to: "/admin/reports", label: "Báo cáo", icon: IconChart },
      { to: "/admin/settings", label: "Cài đặt", icon: IconSettings },
    ],
  },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Close mobile menu when navigate
  const currentPath = location.pathname;

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
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-ink/15 bg-bgsoft/40 w-full focus-within:bg-white focus-within:border-primary transition-colors">
              <IconSearch size={16} className="text-ink-muted" />
              <input
                placeholder="Tìm đơn hàng, khách hàng, garage..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
              />
              <kbd className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-ink/15 bg-white text-ink-muted">
                ⌘K
              </kbd>
            </div>
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

            <button
              className="relative p-2 rounded-lg hover:bg-bgsoft text-ink-muted hover:text-ink"
              aria-label="Thông báo"
            >
              <IconBell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

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
                  Quản trị viên
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
                    end={item.to === "/admin"}
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