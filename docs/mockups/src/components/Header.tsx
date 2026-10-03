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
} from "./icons";
import Button from "./Button";

const navItems = [
  { to: "/cars", label: "Mua xe" },
  { to: "/parts", label: "Phụ kiện" },
  { to: "/services", label: "Đặt lịch sửa chữa" },
  { to: "/news", label: "Tin tức" },
  { to: "/ai/assistant", label: "Trợ lý AI" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

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
          className="md:hidden ml-auto p-2 rounded-lg hover:bg-bgsoft"
          aria-label="Mở menu"
        >
          {open ? <IconClose /> : <IconMenu />}
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