import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  IconActivity,
  IconCalendar,
  IconCash,
  IconShield,
  IconTruck,
  IconList,
  IconClock,
  IconChevronDown,
  IconBox,
} from "./icons";
import { useAuth } from "../data/authStore";
import { roleLabel } from "../api/types";
import { useToast } from "./Toast";
import Avatar from "./Avatar";
import SearchBox from "./SearchBox";
import NotificationBell from "./NotificationBell";

// =========================
// AdminLayout — shell chung cho /admin/*
// Gồm sidebar trái (240px) + topbar trên + content area.
// =========================

interface NavGroup {
  label?: string;
  items: (NavItem | NavFolder)[];
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

/**
 * Một mục trong sidebar. Có thể là:
 *  - `NavItem`  — trang đơn lẻ (mở trực tiếp, không kéo xuống)
 *  - `NavFolder` — nhóm các trang liên quan, bấm vào để kéo xuống (accordion)
 */
interface NavFolder {
  kind: "folder";
  /** id ổn định để lưu trạng thái mở/đóng trong localStorage. */
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: NavItem[];
}

/** Một mục trong sidebar: hoặc trang đơn lẻ, hoặc folder kéo xuống. */
type NavEntry = NavItem | NavFolder;

/** Type guard: phân biệt folder với link đơn lẻ. */
function isFolder(entry: NavEntry): entry is NavFolder {
  return "kind" in entry && entry.kind === "folder";
}

/**
 * Cấu trúc menu admin gom theo nghiệp vụ.
 *
 * Gộp các mục có liên quan vào cùng một "quản lý ..." để sidebar bớt dài:
 *  - Quản lý dịch vụ   : Dịch vụ + Nhóm danh mục (danh mục là cha của dịch vụ)
 *  - Quản lý kho      : Phụ tùng + Nhà cung cấp + Đơn nhập hàng + Sổ kho
 *                        (nhập hàng → tồn kho → phụ tùng là một dòng chảy)
 *  - Quản lý vận hành : Lịch hẹn + Phiếu sửa chữa + Việc của tôi + Lịch trình
 *  - Quản lý nhân sự  : Kỹ thuật viên + Ca làm việc
 */
const navGroups: NavGroup[] = [
  {
    items: [
      { to: "/admin", label: "Dashboard", icon: IconDashboard },
    ],
  },
  {
    label: "Quản lý",
    items: [
      {
        kind: "folder",
        id: "catalog",
        label: "Dịch vụ & danh mục",
        icon: IconWrench,
        items: [
          { to: "/admin/services", label: "Dịch vụ", icon: IconWrench },
          { to: "/admin/categories", label: "Nhóm danh mục", icon: IconList },
        ],
      },
      {
        kind: "folder",
        id: "inventory",
        label: "Kho & phụ tùng",
        icon: IconBox,
        items: [
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
        ],
      },
      {
        kind: "folder",
        id: "operations",
        label: "Vận hành xưởng",
        icon: IconCar,
        items: [
          { to: "/admin/bookings", label: "Lịch hẹn xưởng", icon: IconCalendar },
          { to: "/admin/work-orders", label: "Phiếu sửa chữa", icon: IconWrench },
          {
            to: "/admin/work-orders/mine",
            label: "Việc của tôi",
            icon: IconCheck,
          },
          { to: "/admin/schedule", label: "Lịch trình xưởng", icon: IconCalendar },
        ],
      },
      {
        kind: "folder",
        id: "people",
        label: "Nhân sự",
        icon: IconUsers,
        items: [
          { to: "/admin/staff", label: "Kỹ thuật viên", icon: IconUsers },
          { to: "/admin/work-shifts", label: "Ca làm việc", icon: IconClock },
        ],
      },
      { to: "/admin/invoices", label: "Hóa đơn", icon: IconCash },
      { to: "/admin/vehicles", label: "Hồ sơ Xe & KH", icon: IconCar },
      { to: "/admin/users", label: "Người dùng", icon: IconUsers },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { to: "/admin/permissions", label: "Quyền", icon: IconShield },
      { to: "/admin/roles", label: "Vai trò", icon: IconShield },
      {
        to: "/admin/notification-templates",
        label: "Template thông báo",
        icon: IconBell,
      },
      { to: "/admin/reports", label: "Báo cáo", icon: IconChart },
      { to: "/admin/settings", label: "Cài đặt", icon: IconSettings },
    ],
  },
];

/** Key lưu trạng thái mở/đóng của các folder trong localStorage. */
const OPEN_FOLDERS_KEY = "autocare.admin.openFolders";

/** Ghi trạng thái folder ra localStorage (bỏ qua nếu bị chặn). */
function persistOpenFolders(ids: string[]): void {
  try {
    window.localStorage.setItem(OPEN_FOLDERS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage bị chặn (private mode) — bỏ qua, chỉ mất trạng thái.
  }
}

/**
 * Kiểm tra một route có đang active hay không.
 *
 * Route cha (`/admin/work-orders`) được coi là active khi đang ở route con
 * (`/admin/work-orders/mine`) — trừ khi chính route con cũng nằm trong danh
 * sách, khi đó route cha dùng `end` để không bị highlight nhầm.
 */
function isRouteActive(to: string, pathname: string): boolean {
  if (to === "/admin") return pathname === "/admin";
  if (pathname === to) return true;
  if (!pathname.startsWith(to + "/")) return false;
  // Route con nằm trong cùng nhóm với route cha → cha không active.
  return !NESTED_ROUTE_PARENTS.has(to);
}

/** Các route cha có route con riêng trong menu (dùng `end` khi render). */
const NESTED_ROUTE_PARENTS = new Set(["/admin/work-orders"]);

function readOpenFolders(): string[] {
  try {
    const raw = window.localStorage.getItem(OPEN_FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useToast();

  /**
   * Trạng thái mở/đóng của các folder trong sidebar.
   *
   * <p>Được lưu vào localStorage để giữ nguyên sau khi tải lại trang.
   *
   * <p>Quy tắc hiển thị (accordion): khi điều hướng sang tab/trang khác, chỉ
   * folder chứa route hiện tại được mở — các folder khác tự rút gọn lại.
   * Vì vậy `openFolders` được đồng bộ lại mỗi khi `location.pathname` đổi,
   * thay vì cộng dồn (accumulative) như trước.
   */
  const [openFolders, setOpenFolders] = useState<string[]>(readOpenFolders);
  const location = useLocation();

  const toggleFolder = useCallback((id: string) => {
    setOpenFolders((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      persistOpenFolders(next);
      return next;
    });
  }, []);

  /** Các folder có chứa route đang xem. */
  const activeFolderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of navGroups) {
      for (const entry of group.items) {
        if (!isFolder(entry)) continue;
        if (entry.items.some((i) => isRouteActive(i.to, location.pathname))) {
          ids.add(entry.id);
        }
      }
    }
    return ids;
  }, [location.pathname]);

  /**
   * Folder có đang mở hay không.
   *
   * <p>Chỉ những folder người dùng tự bấm mở (`openFolders`) mới được tính
   * là đang mở. Folder chứa route hiện tại KHÔNG bị ép mở — nếu ép thì nút
   * đóng của người dùng sẽ không bao giờ có tác dụng.
   */
  const isFolderOpen = useCallback(
    (id: string) => openFolders.includes(id),
    [openFolders],
  );

  /**
   * Đồng bộ folder mở theo route hiện tại.
   *
   * <p>- Đang ở trong một folder  → mở đúng folder đó, đóng các folder khác.
   * <p>- Sang trang top-level (vd `/admin/invoices`) → đóng hết các folder,
   *      vì trang đó không thuộc folder nào.
   *
   * <p>Lần mount đầu: chỉ bổ sung folder chứa route hiện tại vào danh sách
   * đang mở (để mục đang xem không bị ẩn), giữ nguyên lựa chọn đã lưu.
   *
   * <p>Các lần sau chỉ chạy khi `pathname` thực sự đổi, để không ghi đè
   * lựa chọn của người dùng khi vừa bấm đóng một folder.
   */
  const prevPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    const isFirstRun = prevPathnameRef.current === null;
    prevPathnameRef.current = location.pathname;

    if (isFirstRun) {
      // Lần đầu: giữ lựa chọn đã lưu, và bổ sung folder chứa route hiện tại
      // (để mục đang xem không bị ẩn).
      setOpenFolders((prev) => {
        const next = [...prev];
        for (const id of activeFolderIds) {
          if (!next.includes(id)) next.push(id);
        }
        persistOpenFolders(next);
        return next;
      });
      return;
    }

    const next = [...activeFolderIds];
    setOpenFolders(next);
    persistOpenFolders(next);
  }, [location.pathname, activeFolderIds]);

  // Panel thông báo — dùng chung component NotificationBell.

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
      match: /hóa đơn|invoice|bill|thanh toán|hoàn tiền/,
      to: "/admin/invoices",
      routeWords: [
        "hóa đơn",
        "invoice",
        "invoices",
        "thanh toán",
        "hoàn tiền",
      ],
    },
    {
      match: /phiếu|work.?order/,
      to: "/admin/work-orders",
      routeWords: ["phiếu", "work order", "work-orders"],
    },
    {
      // "ca làm việc" / "ca trực" → trang ca làm việc. Phải đứng trước rule
      // "nhân viên" vì "ca làm việc" không chứa từ khoá nhân viên, nhưng để
      // trước cho an toàn khi người dùng gõ "ca làm việc nhân viên".
      match: /ca làm việc|ca trực|ca làm|lịch ca|work.?shift/,
      to: "/admin/work-shifts",
      routeWords: [
        "ca làm việc",
        "ca trực",
        "ca làm",
        "lịch ca",
        "work shift",
        "work-shifts",
      ],
    },
    {
      match: /nhân viên|kỹ thuật viên|nhân sự|staff|thợ/,
      to: "/admin/staff",
      routeWords: [
        "nhân viên",
        "kỹ thuật viên",
        "nhân sự",
        "staff",
        "thợ",
      ],
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
        <SidebarContent
          onNavigate={() => {}}
          isFolderOpen={isFolderOpen}
          toggleFolder={toggleFolder}
        />
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
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              isFolderOpen={isFolderOpen}
              toggleFolder={toggleFolder}
            />
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

            {/* Notifications — dùng chung component với Header (khách hàng).
                Nguồn dữ liệu thật: notification-service (SSE + unread-count). */}
            <NotificationBell />

            {/* User avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-ink/10">
              <Avatar
                name={user?.name || "Admin AutoCare"}
                src={user?.avatar}
                size={32}
                className="ring-2 ring-primary/20"
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

/**
 * Một "quản lý ..." trong sidebar — bấm vào để kéo xuống danh sách bên trong.
 *
 * Folder luôn hiển thị chevron xuống/xuống phải để người dùng biết có thể
 * mở ra. Trạng thái mở/đóng do parent quản lý (lưu localStorage).
 */
function NavFolderBlock({
  folder,
  open,
  onToggle,
  onNavigate,
}: {
  folder: NavFolder;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const [mounted, setMounted] = useState(open);

  // Giữ nội dung trong DOM sau khi đóng để có hiệu ứng kéo xuống mượt.
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={[
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors group",
          open ? "text-ink" : "text-ink hover:bg-bgsoft",
        ].join(" ")}
      >
        <folder.icon
          size={16}
          className={
            open ? "text-primary" : "text-ink-muted group-hover:text-ink"
          }
        />
        <span className="flex-1 truncate text-left">{folder.label}</span>
        <IconChevronDown
          size={14}
          className={[
            "text-ink-muted transition-transform duration-200 shrink-0",
            open ? "rotate-0" : "-rotate-90",
          ].join(" ")}
        />
      </button>

      {/* Danh sách con — kéo xuống (accordion) */}
      <div
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <ul className="mt-0.5 mb-1 ml-3 pl-3 border-l border-ink/10 space-y-0.5">
            {folder.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={
                    item.to === "/admin/work-orders" ||
                    item.to === "/admin/work-orders/mine"
                  }
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors group",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-ink-muted hover:text-ink hover:bg-bgsoft",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={14}
                        className={
                          isActive ? "text-primary" : "text-ink-muted group-hover:text-ink"
                        }
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-bgsoft text-ink-muted">
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
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  isFolderOpen,
  toggleFolder,
}: {
  onNavigate: () => void;
  isFolderOpen: (id: string) => boolean;
  toggleFolder: (id: string) => void;
}) {
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
              {group.items.map((item) =>
                isFolder(item) ? (
                  <li key={item.id}>
                    <NavFolderBlock
                      folder={item}
                      open={isFolderOpen(item.id)}
                      onToggle={() => toggleFolder(item.id)}
                      onNavigate={onNavigate}
                    />
                  </li>
                ) : (
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
                ),
              )}
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
