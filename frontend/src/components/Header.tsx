import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  IconSearch,
  IconUser,
  IconMenu,
  IconClose,
  IconCar,
  IconCamera,
  IconChat,
  IconCart,
  IconArrowRight,
  IconSparkles,
} from "./icons";
import Button from "./Button";
import { useCartCount } from "../data/cartStore";
import { useAuth } from "../data/authStore";

const navItems = [
  { to: "/cars", label: "Mua xe" },
  { to: "/parts", label: "Phụ kiện" },
  { to: "/services", label: "Đặt lịch sửa chữa" },
  { to: "/news", label: "Tin tức" },
];

/** Nhóm "AI" — gộp 2 trang vào dropdown cho gọn nav. */
const aiMenuItems = [
  {
    to: "/ai/damage",
    label: "Phân tích hư hỏng",
    desc: "Upload ảnh, phát hiện trầy/móp/vỡ",
    icon: "camera" as const,
  },
  {
    to: "/ai/assistant",
    label: "Trợ lý AI chat",
    desc: "Hỏi đáp về bảo dưỡng, sửa chữa",
    icon: "chat" as const,
  },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [aiMenu, setAiMenu] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const cartCount = useCartCount();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Đóng AI menu khi click-outside
  useEffect(() => {
    if (!aiMenu) return;
    const handler = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setAiMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aiMenu]);

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

          {/* AI dropdown — gộp 2 trang AI vào menu cho gọn */}
          <div ref={aiMenuRef} className="relative">
            <button
              onClick={() => setAiMenu((v) => !v)}
              aria-expanded={aiMenu}
              aria-haspopup="menu"
              className={[
                "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                aiMenu
                  ? "bg-bgsoft text-primary"
                  : "text-ink hover:bg-bgsoft",
              ].join(" ")}
            >
              <IconSparkles size={16} />
              <span>AI</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[
                  "transition-transform",
                  aiMenu ? "rotate-180" : "",
                ].join(" ")}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {aiMenu && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-cardHover border border-ink/10 py-2 z-40"
              >
                <div className="px-4 py-2 border-b border-ink/8 mb-1">
                  <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    Công cụ AI
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Hỗ trợ bảo dưỡng & sửa chữa xe
                  </p>
                </div>
                {aiMenuItems.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    role="menuitem"
                    onClick={() => setAiMenu(false)}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-bgsoft transition-colors"
                  >
                    <div
                      className={[
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        it.icon === "camera"
                          ? "bg-primary text-white"
                          : "bg-accent text-ink",
                      ].join(" ")}
                    >
                      {it.icon === "camera" ? (
                        <IconCamera size={18} />
                      ) : (
                        <IconChat size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink">
                        {it.label}
                      </div>
                      <div className="text-xs text-ink-muted line-clamp-1">
                        {it.desc}
                      </div>
                    </div>
                    <IconArrowRight
                      size={14}
                      className="text-ink-muted mt-2 shrink-0"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
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

          {/* Auth: đã login → avatar + dropdown, chưa → login/register buttons */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-bgsoft transition-colors"
                aria-label="Tài khoản"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-sm text-ink hidden lg:inline max-w-[120px] truncate">
                  {user.name}
                </span>
              </button>

              {userMenu && (
                <>
                  {/* Click-outside catcher */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-cardHover border border-ink/10 py-2 z-40">
                    <div className="px-4 py-3 border-b border-ink/8">
                      <div className="font-semibold text-ink line-clamp-1">
                        {user.name}
                      </div>
                      <div className="text-xs text-ink-muted line-clamp-1">
                        {user.email}
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-bgsoft"
                    >
                      <IconUser size={16} />
                      Tài khoản của tôi
                    </Link>
                    <Link
                      to="/admin"
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 font-medium"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="7" height="9" />
                        <rect x="14" y="3" width="7" height="5" />
                        <rect x="14" y="12" width="7" height="9" />
                        <rect x="3" y="16" width="7" height="5" />
                      </svg>
                      Admin Panel
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-white">
                        DEMO
                      </span>
                    </Link>
                    <Link
                      to="/profile?tab=orders"
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-bgsoft"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      Đơn hàng của tôi
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenu(false);
                        navigate("/login");
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <IconClose size={14} />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/login?mode=register">
                <Button size="sm">Đăng ký</Button>
              </Link>
            </>
          )}
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

            {/* AI group trong mobile menu */}
            <div className="mt-1 pt-2 border-t border-ink/8">
              <div className="flex items-center gap-1.5 px-3 pt-1 pb-2 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
                <IconSparkles size={12} />
                <span>Công cụ AI</span>
              </div>
              {aiMenuItems.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-bgsoft text-primary"
                        : "text-ink hover:bg-bgsoft",
                    ].join(" ")
                  }
                >
                  <div
                    className={[
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      it.icon === "camera"
                        ? "bg-primary text-white"
                        : "bg-accent text-ink",
                    ].join(" ")}
                  >
                    {it.icon === "camera" ? (
                      <IconCamera size={16} />
                    ) : (
                      <IconChat size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{it.label}</div>
                    <div className="text-[11px] text-ink-muted line-clamp-1">
                      {it.desc}
                    </div>
                  </div>
                </NavLink>
              ))}
            </div>

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

            {/* Auth trong mobile menu */}
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-bgsoft"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="line-clamp-1">{user.name}</span>
                  <IconArrowRight size={14} className="ml-auto" />
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/login");
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </header>
  );
}