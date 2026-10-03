import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  IconSearch,
  IconUser,
  IconMenu,
  IconClose,
  IconCar,
  IconCamera,
  IconChat,
  IconCart,
} from "./icons";
import Button from "./Button";
import { useCartCount } from "../data/cartStore";

const navItems = [
  { to: "/cars", label: "Mua xe" },
  { to: "/parts", label: "Phụ kiện" },
  { to: "/services", label: "Đặt lịch sửa chữa" },
  { to: "/news", label: "Tin tức" },
  { to: "/ai/assistant", label: "Trợ lý AI" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-ink/8">
      <div className="container-page h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
            <IconCar size={20} />
          </span>
          <span className="hidden sm:inline text-primary">AutoCare</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-bgsoft text-primary"
                    : "text-ink hover:bg-bgsoft",
                ].join(" ")
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Search (desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md ml-auto">
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-ink/15 bg-bgsoft/40 w-full">
            <IconSearch size={18} className="text-ink-muted" />
            <input
              placeholder="Tìm garage, dịch vụ..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2 ml-auto lg:ml-2">
          <Link
            to="/cart"
            className="relative p-2 rounded-lg hover:bg-bgsoft"
            aria-label={`Giỏ hàng (${cartCount})`}
          >
            <IconCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Đăng nhập
            </Button>
          </Link>
          <Link to="/login?mode=register">
            <Button size="sm">Đăng ký</Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden ml-auto p-2 rounded-lg hover:bg-bgsoft relative"
          aria-label="Mở menu"
        >
          {open ? <IconClose /> : <IconMenu />}
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-ink/8 bg-white">
          <div className="container-page py-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-ink/15 bg-bgsoft/40 mb-2">
              <IconSearch size={18} className="text-ink-muted" />
              <input
                placeholder="Tìm garage, dịch vụ..."
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive ? "bg-bgsoft text-primary" : "text-ink hover:bg-bgsoft",
                  ].join(" ")
                }
              >
                {it.label}
              </NavLink>
            ))}
            <Link
              to="/cart"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-bgsoft"
            >
              <IconCart size={18} />
              <span>Giỏ hàng</span>
              {cartCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <div className="flex gap-2 pt-2 border-t border-ink/8 mt-2">
              <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" fullWidth size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link
                to="/login?mode=register"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <Button fullWidth size="sm">
                  Đăng ký
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}