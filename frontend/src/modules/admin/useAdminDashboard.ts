/**
 * Dữ liệu dashboard cho admin — gom từ nhiều service thật.
 *
 * Backend KHÔNG có endpoint "dashboard" nên ta tổng hợp từ các API có sẵn:
 *  - GET /api/invoices       (billing-service)      → đơn gần đây
 *  - GET /api/reports/...    (billing-service)      → doanh thu 12 tháng
 *  - GET /api/work-orders    (work-order-service)   → số phiếu sửa chữa
 *  - GET /api/staff/bookings (booking-service)      → lịch hẹn sắp tới
 *  - GET /api/users          (user-service)         → tổng tài khoản
 *
 * Mỗi nguồn được bọc try/catch riêng: một service lỗi không được làm hỏng
 * cả trang — phần đó sẽ hiển thị 0 và ghi nhận vào `errors`.
 */
import { useCallback, useEffect, useState } from "react";
import { billingApi } from "../../api/endpoints/billing";
import { reportApi } from "../../api/endpoints/report";
import { workOrderApi } from "../../api/endpoints/workOrder";
import { staffBookingApi } from "../../api/endpoints/booking";
import { adminUserApi } from "../../api/endpoints/user";
import { hasTokenAuthority } from "../../api/session";
import type {
    InvoiceSummaryResponse,
  WorkOrderListItemResponse,
} from "../../api/types";

export interface DashboardKpi {
  id: "revenue" | "orders" | "users" | "conversion";
  label: string;
  value: string;
  delta: number;
  /** Icon key để UI chọn icon phù hợp. */
  icon: "revenue" | "orders" | "users" | "conversion";
  tone: "primary" | "accent" | "success" | "warning";
}

export interface DashboardOrderRow {
  id: string;
  date: string;
  customer: string;
  customerEmail: string;
  totalVND: number;
  status: string;
}

export interface DashboardActivity {
  id: string;
  kind: "invoice" | "work_order" | "booking";
  title: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface DashboardState {
  kpis: DashboardKpi[];
  revenueByMonth: { month: string; revenue: number; orders: number }[];
  recentOrders: DashboardOrderRow[];
  activities: DashboardActivity[];
  totals: {
    invoices: number;
    workOrders: number;
    bookings: number;
    users: number;
    revenueThisMonth: number;
  };
  loading: boolean;
  errors: string[];
  reload: () => void;
}

const MONTH_LABEL = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

/**
 * Đầu ngày theo múi giờ Việt Nam → ISO-8601 instant (UTC).
 *
 * Backend lọc theo `Asia/Ho_Chi_Minh`, nên phải gửi đúng nửa đêm giờ VN —
 * `new Date("yyyy-MM-dd")` sẽ bị JS hiểu là UTC và lệch 7 tiếng.
 */
function vnStartOfDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00+07:00`).toISOString();
}

/** Ngày hôm nay ở giờ Việt Nam, dạng `yyyy-MM-dd`. */
function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fmtVND(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Phần trăm tăng/giảm so với kỳ trước. */
function delta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Chuẩn hoá timestamp ISO cho JS Date. */
function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function useAdminDashboard(): DashboardState {
  const [kpis, setKpis] = useState<DashboardKpi[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<
    { month: string; revenue: number; orders: number }[]
  >([]);
  const [recentOrders, setRecentOrders] = useState<DashboardOrderRow[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [totals, setTotals] = useState({
    invoices: 0,
    workOrders: 0,
    bookings: 0,
    users: 0,
    revenueThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);

  /**
   * Chi goi API ma role hien tai duoc phep doc.
   *
   * <p>Khong goi → khong duoc goi → khong co loi 403. Voi vai tro thu hep
   * (VD thu ngan chi duoc xem hoa don) thi dashboard chi hien phan doc duoc.
   */
  const canReadInvoices = hasTokenAuthority("INVOICE_READ");
  const canReadWorkOrders = hasTokenAuthority("WORK_ORDER_READ");
  const canReadBookings = hasTokenAuthority("BOOKING_READ");
  const canReadUsers = hasTokenAuthority("USER_READ");
  /** Báo cáo doanh thu — nguồn chính xác cho biểu đồ 12 tháng. */
  const canReadReports = hasTokenAuthority("REPORT_READ");

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrors([]);

    (async () => {
      const errs: string[] = [];

      // ── Hóa đơn (đơn gần đây) ────────────────────────────────────────────
      let invoices: InvoiceSummaryResponse[] = [];
      let invoiceTotal = 0;
      if (canReadInvoices) {
        try {
          const page = await billingApi.listInvoices({ size: 100 });
          invoices = page.items ?? [];
          invoiceTotal = page.totalElements ?? invoices.length;
        } catch (err) {
          errs.push(
            err instanceof Error
              ? `Hóa đơn: ${err.message}`
              : "Không tải được danh sách hóa đơn",
          );
        }
      }

      // ── Work Order ───────────────────────────────────────────────────────
      let workOrders: WorkOrderListItemResponse[] = [];
      let workOrderTotal = 0;
      if (canReadWorkOrders) {
        try {
          const page = await workOrderApi.listWorkOrders({ size: 100 });
          workOrders = page.items ?? [];
          workOrderTotal = page.totalElements ?? workOrders.length;
        } catch (err) {
          errs.push(
            err instanceof Error
              ? `Phiếu sửa chữa: ${err.message}`
              : "Không tải được danh sách phiếu sửa chữa",
          );
        }
      }

      // ── Lịch hẹn ─────────────────────────────────────────────────────────
      let bookingTotal = 0;
      if (canReadBookings) {
        try {
          const page = await staffBookingApi.listBookings({ size: 1 });
          bookingTotal = page.totalElements ?? 0;
        } catch (err) {
          errs.push(
            err instanceof Error
              ? `Lịch hẹn: ${err.message}`
              : "Không tải được danh sách lịch hẹn",
          );
        }
      }

      // ── Người dùng ───────────────────────────────────────────────────────
      let userTotal = 0;
      if (canReadUsers) {
        try {
          const page = await adminUserApi.listUsers({ size: 1 });
          userTotal = page.totalElements ?? 0;
        } catch (err) {
          errs.push(
            err instanceof Error
              ? `Người dùng: ${err.message}`
              : "Không tải được danh sách người dùng",
          );
        }
      }

      if (cancelled) return;

      // ── Tính doanh thu theo tháng (12 tháng gần nhất) ────────────────────
      //
      // ƯU TIÊN: gọi `/api/reports/revenue/by-period` (billing-service) — đây là
      // query tổng hợp trên DB nên KHÔNG bị giới hạn bởi `size` của phân trang.
      //
      // FALLBACK: nếu không có `REPORT_READ` (hoặc API lỗi) → tự gom từ danh sách
      // hóa đơn đã tải. Fallback này CHỈ ĐÚNG khi tổng số hóa đơn ≤ trang đã
      // tải — nếu vượt quá thì biểu đồ sẽ thiếu (ghi chú trong `errors`).
      let revenueChart: {
        month: string;
        revenue: number;
        orders: number;
      }[] = [];
      let revenueThisMonth = 0;
      let revenuePrevMonth = 0;
      let revenueFromReports = false;

      if (canReadReports) {
        try {
          const today = todayVN();
          const [y, m] = today.split("-").map(Number);
          // 12 tháng gần nhất: từ đầu tháng (m-11) tới đầu tháng kế tiếp.
          const start = new Date(Date.UTC(y, m - 1 - 11, 1));
          const end = new Date(Date.UTC(y, m, 1));

          const periods = await reportApi.revenueByPeriod({
            from: vnStartOfDay(start.toISOString().slice(0, 10)),
            to: vnStartOfDay(end.toISOString().slice(0, 10)),
            granularity: "MONTH",
          });

          revenueChart = (periods ?? []).map((p) => {
            const [py, pm] = p.period.split("-").map(Number);
            return {
              month: `${MONTH_LABEL[pm - 1]}/${String(py).slice(2)}`,
              // `revenue` tính theo đơn vị triệu (khớp cách hiển thị cũ).
              revenue: Math.round(p.netRevenue / 1_000_000),
              orders: p.invoiceCount,
            };
          });
          revenueFromReports = true;

          // KPI doanh thu tháng này / tháng trước — lấy từ cùng nguồn.
          const thisKey = `${y}-${String(m).padStart(2, "0")}`;
          const prevDate = new Date(Date.UTC(y, m - 2, 1));
          const prevKey = `${prevDate.getUTCFullYear()}-${String(
            prevDate.getUTCMonth() + 1,
          ).padStart(2, "0")}`;
          for (const p of periods ?? []) {
            if (p.period === thisKey) revenueThisMonth = p.netRevenue;
            if (p.period === prevKey) revenuePrevMonth = p.netRevenue;
          }
        } catch (err) {
          errs.push(
            err instanceof Error
              ? `Doanh thu 12 tháng: ${err.message}`
              : "Không tải được doanh thu 12 tháng",
          );
        }
      }

      if (!revenueFromReports) {
        // ── Fallback: gom tay từ danh sách hóa đơn đã tải ────────────────
        const now = new Date();
        const buckets = new Map<string, { revenue: number; orders: number }>();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
            revenue: 0,
            orders: 0,
          });
        }
        const prevKey = `${now.getFullYear()}-${now.getMonth() - 1}`;
        const thisKey = `${now.getFullYear()}-${now.getMonth()}`;

        for (const inv of invoices) {
          const d = toDate(inv.issuedAt);
          if (!d) continue;
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const bucket = buckets.get(key);
          // Hóa đơn VOID không tính doanh thu.
          if (inv.status !== "VOID") {
            if (bucket) {
              bucket.revenue += Number(inv.grandTotal ?? 0);
              bucket.orders += 1;
            }
            if (key === thisKey) revenueThisMonth += Number(inv.grandTotal ?? 0);
            if (key === prevKey) revenuePrevMonth += Number(inv.grandTotal ?? 0);
          }
        }

        revenueChart = Array.from(buckets.entries()).map(([key, v]) => {
          const [yy, mm] = key.split("-").map(Number);
          return {
            month: `${MONTH_LABEL[mm]}/${String(yy).slice(2)}`,
            revenue: Math.round(v.revenue / 1_000_000),
            orders: v.orders,
          };
        });

        if (canReadInvoices && invoiceTotal > invoices.length) {
          errs.push(
            "Doanh thu 12 tháng chỉ tính trên " +
              `${invoices.length}/${invoiceTotal} hóa đơn gần nhất — ` +
              "cần quyền xem báo cáo để có số liệu đầy đủ.",
          );
        }
      }

      // ── Đơn gần đây (từ hóa đơn mới nhất) ───────────────────────────────
      const sortedInvoices = [...invoices].sort((a, b) =>
        (toDate(b.issuedAt)?.getTime() ?? 0) - (toDate(a.issuedAt)?.getTime() ?? 0),
      );
      const orders: DashboardOrderRow[] = sortedInvoices.slice(0, 6).map((inv) => ({
        id: inv.code,
        date: fmtDate(inv.issuedAt),
        customer: "Khách hàng",
        customerEmail: "",
        totalVND: Number(inv.grandTotal ?? 0),
        status: inv.status,
      }));

      // ── Hoạt động gần đây ────────────────────────────────────────────────
      const acts: DashboardActivity[] = [];
      for (const inv of sortedInvoices.slice(0, 4)) {
        acts.push({
          id: `inv-${inv.id}`,
          kind: "invoice",
          title: `Hóa đơn ${inv.code}`,
          description: `${fmtVND(Number(inv.grandTotal ?? 0))} · ${inv.status}`,
          actor: "Hệ thống",
          timestamp: inv.issuedAt,
        });
      }
      for (const wo of workOrders.slice(0, 3)) {
        acts.push({
          id: `wo-${wo.id}`,
          kind: "work_order",
          title: `Phiếu sửa chữa ${wo.code}`,
          description: `Trạng thái: ${wo.status}`,
          actor: "Xưởng",
          timestamp: wo.createdAt,
        });
      }
      acts.sort(
        (a, b) =>
          (toDate(b.timestamp)?.getTime() ?? 0) - (toDate(a.timestamp)?.getTime() ?? 0),
      );

      // ── KPI ──────────────────────────────────────────────────────────────
      const completedOrders = workOrders.filter(
        (w) => w.status === "COMPLETED" || w.status === "CLOSED",
      );
      const conversion =
        workOrders.length > 0
          ? (completedOrders.length / workOrders.length) * 100
          : 0;

      setKpis([
        {
          id: "revenue",
          label: "Doanh thu tháng này",
          value: fmtVND(revenueThisMonth),
          delta: delta(revenueThisMonth, revenuePrevMonth),
          icon: "revenue",
          tone: "primary",
        },
        {
          id: "orders",
          label: "Phiếu sửa chữa",
          value: new Intl.NumberFormat("vi-VN").format(workOrderTotal),
          delta: 0,
          icon: "orders",
          tone: "success",
        },
        {
          id: "users",
          label: "Tài khoản",
          value: new Intl.NumberFormat("vi-VN").format(userTotal),
          delta: 0,
          icon: "users",
          tone: "accent",
        },
        {
          id: "conversion",
          label: "Tỉ lệ hoàn thành",
          value: conversion.toFixed(2) + "%",
          delta: 0,
          icon: "conversion",
          tone: "warning",
        },
      ]);

      setRevenueByMonth(revenueChart);
      setRecentOrders(orders);
      setActivities(acts.slice(0, 7));
      setTotals({
        invoices: invoices.length,
        workOrders: workOrderTotal,
        bookings: bookingTotal,
        users: userTotal,
        revenueThisMonth,
      });
      setErrors(errs);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    nonce,
    canReadInvoices,
    canReadReports,
    canReadWorkOrders,
    canReadBookings,
    canReadUsers,
  ]);

  return {
    kpis,
    revenueByMonth,
    recentOrders,
    activities,
    totals,
    loading,
    errors,
    reload,
  };
}
