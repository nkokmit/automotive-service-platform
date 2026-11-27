/**
 * Ma trận phân quyền màn hình admin.
 *
 * NGUYEN TAC: moi man hinh deu ganh mot danh sach authority tuong ung voi
 * `@PreAuthorize` cua backend. Frontend chi doc danh sach nay de an/hien menu
 * va chan route — backend van la noi thuc thi that, frontend khong phai lop
 * bao ve (defence in depth, khong thay the).
 *
 * Nguon su that: cac controller cua tung backend service + cac migration
 * V4/V5/V9/V10/V11/V14/V15/V16/V19/V20 trong user-service.
 */

// ── Authority theo nhom nghiep vu ────────────────────────────────────────────
// Chi lay nhung authority backend THAT SU kiem tra tren API tuong ung.

/** Doc danh muc (dich vu, nhom danh muc, BOM). */
export const CATALOG_READ = "SERVICE_READ";
export const CATALOG_WRITE = "SERVICE_WRITE";

/** Phu tung, nha cung cap, don nhap hang, so kho. */
export const INVENTORY_READ = "PART_READ";
export const INVENTORY_WRITE = "PART_WRITE";
export const SUPPLIER_READ = "SUPPLIER_READ";
export const SUPPLIER_WRITE = "SUPPLIER_WRITE";
export const PURCHASE_ORDER_READ = "PURCHASE_ORDER_READ";
export const PURCHASE_ORDER_WRITE = "PURCHASE_ORDER_WRITE";
export const LEDGER_READ = "INVENTORY_TRANSACTION_READ";

/** Lich hen (xep lich, check-in). */
export const BOOKING_READ = "BOOKING_READ";
export const BOOKING_WRITE = "BOOKING_CREATE";
export const BOOKING_CHECK_IN = "BOOKING_CHECK_IN";

/** Phieu sua chua va bao gia. */
export const WORK_ORDER_READ = "WORK_ORDER_READ";
export const WORK_ORDER_CREATE = "WORK_ORDER_CREATE";
export const ESTIMATE_READ = "ESTIMATE_READ";
export const ESTIMATE_CREATE = "ESTIMATE_CREATE";
export const ESTIMATE_DECISION = "ESTIMATE_DECISION_RECORD";

/** Nhan su. */
export const STAFF_READ = "STAFF_READ";
export const STAFF_WRITE = "STAFF_CREATE";
export const WORK_SHIFT_READ = "WORK_SHIFT_READ";
export const WORK_SHIFT_WRITE = "WORK_SHIFT_CREATE";
export const STAFF_SCHEDULE_READ = "STAFF_SCHEDULE_READ";

/** Hoa don va thanh toan. */
export const INVOICE_READ = "INVOICE_READ";
export const INVOICE_WRITE = "INVOICE_WRITE";
export const PAYMENT_READ = "PAYMENT_READ";
export const PAYMENT_WRITE = "PAYMENT_WRITE";
export const PAYMENT_REFUND = "PAYMENT_REFUND";

/** Khach hang, xe, lich su bao duong. */
export const CUSTOMER_READ = "CUSTOMER_READ";
export const VEHICLE_READ = "VEHICLE_READ";
export const SERVICE_HISTORY_READ = "SERVICE_HISTORY_READ";

/** Tai khoan, vai tro, quyen, thong bao. */
export const USER_READ = "USER_READ";
export const USER_WRITE = "USER_CREATE";
export const ROLE_READ = "ROLE_READ";
export const ROLE_WRITE = "ROLE_WRITE";
export const PERMISSION_READ = "PERMISSION_READ";
export const PERMISSION_WRITE = "PERMISSION_WRITE";
export const NOTIFICATION_TEMPLATE_READ = "NOTIFICATION_TEMPLATE_READ";
export const NOTIFICATION_TEMPLATE_WRITE = "NOTIFICATION_TEMPLATE_WRITE";

/** Nhan vien hien duoc gan hang muc. */
export const ASSIGNED_LINE_READ = "SERVICE_LINE_READ_ASSIGNED";
export const ASSIGNED_LINE_START = "SERVICE_LINE_START";
export const ASSIGNED_LINE_COMPLETE = "SERVICE_LINE_COMPLETE";
export const PART_ISSUE = "PART_ISSUE";
export const PART_RELEASE = "PART_RELEASE";

/** Tin tuc: danh muc bai viet, bai viet va binh luan. */
export const NEWS_CATEGORY_READ = "NEWS_CATEGORY_READ";
export const NEWS_CATEGORY_WRITE = "NEWS_CATEGORY_WRITE";
export const NEWS_ARTICLE_READ = "NEWS_ARTICLE_READ";
export const NEWS_ARTICLE_WRITE = "NEWS_ARTICLE_WRITE";
export const NEWS_COMMENT_READ = "NEWS_COMMENT_READ";
export const NEWS_COMMENT_CREATE = "NEWS_COMMENT_CREATE";
export const NEWS_COMMENT_MODERATE = "NEWS_COMMENT_MODERATE";

/**
 * Authority ma MOT man hinh can co — chi can MOT trong danh sach.
 *
 * <p>Dung khi mot man hinh doc duoc theo nhieu quyen khac nhau (VD trang
 * phieu sua chua doc duoc cho ca admin, manager, service advisor).
 */
export type AccessRule = {
  /** Duong dan route (co the la duong dan con). */
  path: string;
  /** Can it nhat MOT authority trong danh sach. */
  anyOf: string[];
};

// ── Ma tran truy cap theo route ─────────────────────────────────────────────

/**
 * Bang truy cap cua tat ca man hinh trong `/admin`.
 *
 * <p>Thu tu kiem tra: route con duoc kiem tra TRUOC route cha, nen `/admin/work-orders/mine`
 * phai dung truoc `/admin/work-orders`.
 */
export const ADMIN_ACCESS_RULES: AccessRule[] = [
  // ── Nhan su ────────────────────────────────────────────────────────────────
  {
    path: "/admin/staff",
    anyOf: [STAFF_READ],
  },
  {
    path: "/admin/work-shifts",
    anyOf: [WORK_SHIFT_READ],
  },
  {
    path: "/admin/schedule",
    anyOf: [STAFF_SCHEDULE_READ],
  },

  // ── Hoa don / thanh toan ───────────────────────────────────────────────────
  { path: "/admin/invoices", anyOf: [INVOICE_READ] },

  // ── Vat hanh xuong ─────────────────────────────────────────────────────────
  { path: "/admin/bookings", anyOf: [BOOKING_READ] },
  {
    path: "/admin/work-orders/mine",
    anyOf: [ASSIGNED_LINE_READ],
  },
  { path: "/admin/work-orders", anyOf: [WORK_ORDER_READ] },

  // ── Kho & phu tung ─────────────────────────────────────────────────────────
  { path: "/admin/parts", anyOf: [INVENTORY_READ] },
  { path: "/admin/suppliers", anyOf: [SUPPLIER_READ] },
  { path: "/admin/purchase-orders", anyOf: [PURCHASE_ORDER_READ] },
  { path: "/admin/inventory-transactions", anyOf: [LEDGER_READ] },

  // ── Dich vu & danh muc ─────────────────────────────────────────────────────
  { path: "/admin/services", anyOf: [CATALOG_READ] },
  { path: "/admin/categories", anyOf: [CATALOG_READ] },

  // ── Ho so Xe & KH ─────────────────────────────────────────────────────────
  {
    path: "/admin/vehicles",
    anyOf: [CUSTOMER_READ, VEHICLE_READ],
  },

  // ── Tin tuc ───────────────────────────────────────────────────────────────
  { path: "/admin/news", anyOf: [NEWS_ARTICLE_READ] },
  { path: "/admin/news-categories", anyOf: [NEWS_CATEGORY_READ] },

  // ── He thong ───────────────────────────────────────────────────────────────
  { path: "/admin/users", anyOf: [USER_READ] },
  { path: "/admin/roles", anyOf: [ROLE_READ] },
  { path: "/admin/permissions", anyOf: [PERMISSION_READ] },
  {
    path: "/admin/notification-templates",
    anyOf: [NOTIFICATION_TEMPLATE_READ],
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────
  // Trang tong quan doc nhieu API nen yeu cau mot quyen doc bat ky nao.
  //
  // LUU Y: phai gom ca `ASSIGNED_LINE_READ` — role MECHANIC chi co quyen
  // xem hang muc duoc giao (khong co `WORK_ORDER_READ`), neu khong gom vao
  // thi tho khong vao duoc `/admin` ma chi co `/admin/work-orders/mine`.
  {
    path: "/admin",
    anyOf: [
      WORK_ORDER_READ,
      INVOICE_READ,
      BOOKING_READ,
      ASSIGNED_LINE_READ,
      STAFF_READ,
      INVENTORY_READ,
      CATALOG_READ,
      NEWS_ARTICLE_READ,
    ],
  },
];

/**
 * Authority duoc can de vao `/admin` (khong phai route con).
 *
 * <p>Dung cho route guard: nguoi dung khong co quyen nao o tren thi khong
 * duoc vao khu vuc admin, thay vi thay mot trang trong trong.
 */
export const ADMIN_ENTRY_AUTHORITIES = [
  WORK_ORDER_READ,
  INVOICE_READ,
  BOOKING_READ,
  ASSIGNED_LINE_READ,
  STAFF_READ,
  INVENTORY_READ,
  CATALOG_READ,
  USER_READ,
  NEWS_ARTICLE_READ,
];

/**
 * Route co the truy cap duoc voi route hien tai.
 *
 * <p>Luon de true cho `/admin` va cac route cha de moi phien ban co the vao
 * dashboard duoc.
 */
export function canAccessAdminPath(
  pathname: string,
  hasAuthority: (authority: string) => boolean,
): boolean {
  // Route cha: kiem tra quyen cua chinh route con do truoc.
  const matched = ADMIN_ACCESS_RULES.filter(
    (rule) =>
      pathname === rule.path ||
      // Rule catch-all `/admin` chi khop DUNG dashboard, khong phai route con
      // (neu khop route con thi moi man hinh deu bi "chung" quyen cua dashboard).
      (rule.path !== "/admin" && pathname.startsWith(rule.path + "/")),
  );

  if (matched.length === 0) {
    // Route khong khai bao (VD `/admin/reports`, `/admin/settings`) → cho phep,
    // cac trang nay dang la placeholder.
    return true;
  }

  // Chi xet rule "cua nhat" (duong dai nhat) — KHONG fallback sang rule cha.
  //
  // LY DO: `/admin/users` khop ca rule `/admin/users` VA rule catch-all
  // `/admin`. Neu fallback, role khong co `USER_READ` nhung co `WORK_ORDER_READ`
  // (vi du SERVICE_ADVISOR) van lot qua duoc → 403 khong hoat dong.
  // Do lai, rule catch-all `/admin` chi dung cho chinh trang dashboard
  // (pathname === "/admin"), khong phai cho cac route con.
  const sorted = [...matched].sort(
    (a, b) => b.path.length - a.path.length,
  );
  const rule = sorted[0];

  return rule.anyOf.some((authority) => hasAuthority(authority));
}

/**
 * Ten man hinh de hien tren trang 403.
 *
 * <p>Lay tu bang rule khop dau tien theo duong dan.
 */
export function adminPageTitle(pathname: string): string {
  const rule = ADMIN_ACCESS_RULES.filter(
    (r) =>
      pathname === r.path ||
      (r.path !== "/admin" && pathname.startsWith(r.path + "/")),
  ).sort((a, b) => b.path.length - a.path.length)[0];
  return rule?.path ?? pathname;
}

