/**
 * AdminReports — module Báo cáo & Thống kê doanh thu.
 *
 * Nguồn dữ liệu (billing-service):
 *  - GET /api/reports/revenue/overview     → tổng quan kỳ (gross/net, đã thu, công nợ)
 *  - GET /api/reports/revenue/by-period    → xu hướng theo ngày/tuần/tháng/năm
 *  - GET /api/reports/revenue/by-service   → doanh thu theo dịch vụ / phụ tùng
 *  - GET /api/reports/revenue/by-category  → doanh thu theo nhóm dịch vụ
 *  - GET /api/reports/payments/breakdown   → phân bổ phương thức thanh toán
 *
 * Cần authority: `REPORT_READ` (role ADMIN / MANAGER / CASHIER).
 *
 * Lưu ý về múi giờ: backend dùng `Asia/Ho_Chi_Minh` cho cả doanh thu lẫn
 * dòng tiền. Frontend gửi `from`/`to` dạng ISO-8601 instant nên không bị lệch
 * ngày so với cách server báo cáo.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconRefresh,
  IconChart,
  IconCash,
  IconWallet,
  IconShoppingBag,
  IconWarning,
  IconTrendUp,
  IconPackage,
  IconWrench,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { reportApi } from "../../api/endpoints/report";
import type {
  PaymentBreakdownResponse,
  ReportGranularity,
  ReportItemType,
  RevenueByCategoryResponse,
  RevenueByItemResponse,
  RevenueOverviewResponse,
  RevenuePeriodResponse,
} from "../../api/types";
import { formatCompactVND as compactVND } from "../../utils/format";

// =========================
// Hằng số & helper
// =========================

/** Khoảng thời gian dùng nhanh. */
type PresetKey = "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "CUSTOM";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "THIS_MONTH", label: "Tháng này" },
  { key: "LAST_MONTH", label: "Tháng trước" },
  { key: "THIS_QUARTER", label: "Quý này" },
  { key: "THIS_YEAR", label: "Năm nay" },
  { key: "CUSTOM", label: "Tùy chọn" },
];

/** Mức tổng hợp chuỗi thời gian. */
const GRANULARITIES: { value: ReportGranularity; label: string }[] = [
  { value: "DAY", label: "Theo ngày" },
  { value: "WEEK", label: "Theo tuần" },
  { value: "MONTH", label: "Theo tháng" },
  { value: "YEAR", label: "Theo năm" },
];

/** Bộ lọc loại hạng mục. */
const ITEM_TYPES: { value: ReportItemType | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "SERVICE", label: "Dịch vụ" },
  { value: "PART", label: "Phụ tùng" },
];

/** Nhãn phương thức thanh toán. */
const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
};

/** Màu theo phương thức thanh toán — dùng cho biểu đồ tròn. */
const PAYMENT_COLORS: Record<string, string> = {
  CASH: "rgb(37 99 235)",
  BANK_TRANSFER: "rgb(16 185 129)",
  CARD: "rgb(245 158 11)",
};

const TZ = "Asia/Ho_Chi_Minh";

/**
 * Khoảng [from, to) theo múi giờ Việt Nam.
 *
 * `to` là bắt đầu của ngày KẾ TIẾP (nửa mở) để không bỏ sót hóa đơn trong
 * ngày cuối cùng — khớp với cách backend lọc.
 */
function buildRange(
  preset: PresetKey,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  if (preset === "CUSTOM") {
    if (!customFrom || !customTo) return {};
    return {
      from: vnStartOfDay(customFrom),
      // Bao gồm trọn ngày `customTo` → to = đầu ngày kế tiếp (nửa mở).
      to: vnStartOfDay(addDays(customTo, 1)),
    };
  }

  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;

  if (preset === "THIS_MONTH") {
    return {
      from: vnStartOfDay(monthStartISO(year, month)),
      to: vnStartOfDay(monthStartISO(year, month + 1)),
    };
  }

  if (preset === "LAST_MONTH") {
    return {
      from: vnStartOfDay(monthStartISO(year, month - 1)),
      to: vnStartOfDay(monthStartISO(year, month)),
    };
  }

  if (preset === "THIS_QUARTER") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      from: vnStartOfDay(monthStartISO(year, quarterStartMonth)),
      to: vnStartOfDay(monthStartISO(year, quarterStartMonth + 3)),
    };
  }

  // THIS_YEAR
  return {
    from: vnStartOfDay(`${year}-01-01`),
    to: vnStartOfDay(`${year + 1}-01-01`),
  };
}

/**
 * Ngày đầu tháng (0-based month) dạng `yyyy-MM-dd`.
 *
 * Tự xử lý việc lùi năm khi month < 0 hoặc vượt 11 — tránh lỗi "2026-00-01"
 * khi tháng trước rơi vào năm trước.
 */
function monthStartISO(year: number, monthIndex0: number): string {
  const normalized = new Date(Date.UTC(year, monthIndex0, 1));
  return normalized.toISOString().slice(0, 10);
}

/** Cộng số ngày vào chuỗi `yyyy-MM-dd`. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Đầu ngày (00:00) theo múi giờ Việt Nam → ISO-8601 instant (UTC).
 *
 * Backend lọc theo `Asia/Ho_Chi_Minh`, nên phải gửi đúng thời điểm nửa đêm
 * giờ VN — nếu dùng `new Date("yyyy-MM-dd")` thì JS hiểu là UTC và lệch 7 tiếng.
 */
function vnStartOfDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00+07:00`).toISOString();
}

/** Nhãn kỳ cho trục X. */
function formatPeriodLabel(period: string, granularity: ReportGranularity): string {
  if (granularity === "YEAR") return period;
  if (granularity === "MONTH") {
    const [y, m] = period.split("-");
    return `T${Number(m)}/${y.slice(2)}`;
  }
  if (granularity === "WEEK") return period.replace("-W", "W");
  const [y, m, d] = period.split("-");
  return `${d}/${m}`;
}

/** Ngày hôm nay theo định dạng `yyyy-MM-dd` (múi giờ Việt Nam). */
function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

// =========================
// Component
// =========================

export default function AdminReports() {
  const [preset, setPreset] = useState<PresetKey>("THIS_MONTH");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(todayISO());
  const [granularity, setGranularity] = useState<ReportGranularity>("MONTH");
  const [itemType, setItemType] = useState<ReportItemType | "">("");

  const [overview, setOverview] = useState<RevenueOverviewResponse | null>(
    null,
  );
  const [periods, setPeriods] = useState<RevenuePeriodResponse[]>([]);
  const [items, setItems] = useState<RevenueByItemResponse[]>([]);
  const [categories, setCategories] = useState<RevenueByCategoryResponse[]>([]);
  const [payments, setPayments] = useState<PaymentBreakdownResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(
    () => buildRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi song song 5 endpoint — đều là query tổng hợp trên DB billing.
      const [ov, per, itm, cat, pay] = await Promise.all([
        reportApi.overview(range),
        reportApi.revenueByPeriod({ ...range, granularity }),
        reportApi.revenueByService({
          ...range,
          itemType: itemType || undefined,
        }),
        reportApi.revenueByCategory(range),
        reportApi.paymentBreakdown(range),
      ]);
      setOverview(ov);
      setPeriods(per ?? []);
      setItems(itm ?? []);
      setCategories(cat ?? []);
      setPayments(pay ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được dữ liệu báo cáo từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [range, granularity, itemType]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Dòng tiền ròng = đã thu − đã hoàn. */
  const netCash = useMemo(() => {
    if (!overview) return 0;
    return overview.collectedRevenue - overview.refundedRevenue;
  }, [overview]);

  return (
    <div className="space-y-5">
      {/* ============ Header ============ */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconChart size={20} />
            </span>
            Báo cáo &amp; Thống kê
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Doanh thu, dòng tiền và cơ cấu hóa đơn của xưởng.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <IconWarning size={15} />
            {error}
          </span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* ============ Bộ lọc ============ */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-muted">Khoảng:</span>
          {PRESETS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPreset(option.key)}
              className={[
                "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
                preset === option.key
                  ? "bg-primary text-white"
                  : "bg-bgsoft text-ink-muted hover:bg-ink/10",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}

          {preset === "CUSTOM" && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 px-2 rounded-lg border border-ink/15 text-xs bg-white"
              />
              <span className="text-xs text-ink-muted">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 px-2 rounded-lg border border-ink/15 text-xs bg-white"
              />
            </div>
          )}

          <div className="flex-1" />

          <span className="text-xs text-ink-muted">Tổng hợp:</span>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as ReportGranularity)}
            className="h-8 px-2 rounded-lg border border-ink/15 text-xs bg-white"
          >
            {GRANULARITIES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>

          <span className="text-xs text-ink-muted">Hạng mục:</span>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value as ReportItemType | "")}
            className="h-8 px-2 rounded-lg border border-ink/15 text-xs bg-white"
          >
            {ITEM_TYPES.map((t) => (
              <option key={t.value || "all"} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* ============ KPI tổng quan ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<IconTrendUp size={18} className="text-white" />}
          tone="bg-primary"
          label="Doanh thu thuần"
          value={overview ? compactVND(overview.netRevenue) : "—"}
          hint={
            overview
              ? `Gross ${compactVND(overview.grossRevenue)} · ${overview.invoiceCount} hóa đơn`
              : undefined
          }
        />
        <KpiCard
          icon={<IconCash size={18} className="text-white" />}
          tone="bg-emerald-500"
          label="Tiền thực thu"
          value={overview ? compactVND(netCash) : "—"}
          hint={
            overview
              ? `Đã thu ${compactVND(overview.collectedRevenue)} · hoàn ${compactVND(overview.refundedRevenue)}`
              : undefined
          }
        />
        <KpiCard
          icon={<IconWallet size={18} className="text-white" />}
          tone="bg-amber-500"
          label="Công nợ"
          value={overview ? compactVND(overview.outstandingRevenue) : "—"}
          hint={
            overview
              ? `TB ${compactVND(overview.averageInvoiceValue)}/hóa đơn`
              : undefined
          }
        />
        <KpiCard
          icon={<IconShoppingBag size={18} className="text-white" />}
          tone="bg-rose-500"
          label="Chiết khấu & thuế"
          value={
            overview
              ? compactVND(overview.totalDiscount + overview.totalTax)
              : "—"
          }
          hint={
            overview
              ? `CK ${compactVND(overview.totalDiscount)} · thuế ${compactVND(overview.totalTax)}`
              : undefined
          }
        />
      </div>

      {/* ============ Xu hướng + cơ cấu ============ */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <IconChart size={18} className="text-primary" />
                    Xu hướng doanh thu
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Cột xám = gross, đường xanh = net (sau chiết khấu &amp; thuế)
                  </p>
                </div>
                {overview && overview.voidedInvoiceCount > 0 && (
                  <Badge tone="default">
                    {overview.voidedInvoiceCount} hóa đơn bị huỷ (không tính)
                  </Badge>
                )}
              </div>
              {periods.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-ink-muted">
                  {loading ? "Đang tải..." : "Không có dữ liệu trong khoảng này"}
                </div>
              ) : (
                <TrendChart data={periods} granularity={granularity} />
              )}
            </div>
          </Card>
        </div>

        <Card hover={false}>
          <div className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <IconCash size={18} className="text-primary" />
              Phương thức thanh toán
            </h2>
            {payments.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                Chưa có giao dịch
              </div>
            ) : (
              <>
                <PaymentDonut data={payments} />
                <ul className="mt-4 space-y-2.5">
                  {payments.map((p) => (
                    <li key={p.paymentMethod} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            PAYMENT_COLORS[p.paymentMethod] ?? "rgb(100 116 139)",
                        }}
                      />
                      <span className="flex-1 text-ink-muted">
                        {PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod}
                      </span>
                      <span className="font-semibold">
                        {compactVND(p.collectedAmount)}
                      </span>
                      <span className="w-10 text-right text-ink-muted">
                        {Math.round(p.ratio * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
                {payments.some((p) => p.refundedAmount > 0) && (
                  <p className="mt-3 text-[11px] text-ink-muted">
                    Đã hoàn trong kỳ:{" "}
                    {compactVND(
                      payments.reduce((sum, p) => sum + p.refundedAmount, 0),
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ============ Nhóm dịch vụ + dịch vụ chi tiết ============ */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-1">
                <IconWrench size={18} className="text-primary" />
                Doanh thu theo nhóm dịch vụ
              </h2>
              <p className="text-xs text-ink-muted mb-4">
                Nhóm lấy từ danh mục dịch vụ; phụ tùng gom riêng.
              </p>
              {categories.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-muted">
                  Không có dữ liệu
                </div>
              ) : (
                <ul className="space-y-3">
                  {categories.map((c) => (
                    <li key={c.categoryName}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate">{c.categoryName}</span>
                        <span className="text-ink-muted shrink-0 ml-2">
                          {compactVND(c.grossRevenue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-bgsoft overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, c.ratio * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {c.itemCount} hạng mục · {Math.round(c.ratio * 100)}% · net{" "}
                        {compactVND(c.netRevenue)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card hover={false}>
            <div className="p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-1">
                <IconPackage size={18} className="text-primary" />
                Doanh thu theo dịch vụ / phụ tùng
              </h2>
              <p className="text-xs text-ink-muted mb-4">
                {items.length} hạng mục có doanh thu trong kỳ.
              </p>
              {items.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-muted">
                  Không có dữ liệu
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-ink-muted uppercase">
                        <th className="font-medium px-2 py-2">Hạng mục</th>
                        <th className="font-medium px-2 py-2 text-right">SL</th>
                        <th className="font-medium px-2 py-2 text-right">Gross</th>
                        <th className="font-medium px-2 py-2 text-right">Net</th>
                        <th className="font-medium px-2 py-2 text-right w-24">Tỉ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={`${item.itemType}-${item.catalogId}`}
                          className="border-t border-ink/8 hover:bg-bgsoft/40"
                        >
                          <td className="px-2 py-2.5">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-[10px] text-ink-muted font-mono">
                              {item.code}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-right text-ink-muted">
                            {item.quantity}
                          </td>
                          <td className="px-2 py-2.5 text-right whitespace-nowrap">
                            {compactVND(item.grossRevenue)}
                          </td>
                          <td className="px-2 py-2.5 text-right whitespace-nowrap font-semibold text-primary">
                            {compactVND(item.netRevenue)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="h-1.5 w-14 rounded-full bg-bgsoft overflow-hidden">
                                <span
                                  className="block h-full rounded-full bg-primary"
                                  style={{
                                    width: `${Math.min(100, item.ratio * 100)}%`,
                                  }}
                                />
                              </span>
                              <span className="w-9 text-right text-ink-muted">
                                {Math.round(item.ratio * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function KpiCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card hover={false}>
      <div className="p-4">
        <div className={["w-10 h-10 rounded-xl flex items-center justify-center mb-2", tone].join(" ")}>
          {icon}
        </div>
        <div className="text-xl md:text-2xl font-bold text-ink leading-tight">
          {value}
        </div>
        <div className="text-xs text-ink-muted mt-1">{label}</div>
        {hint && (
          <div className="text-[10px] text-ink-muted mt-1 truncate" title={hint}>
            {hint}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Biểu đồ xu hướng — cột (gross) + đường (net).
 *
 * Vẽ bằng SVG thuần (không thêm thư viện chart) — đúng pattern của
 * `RevenueChart` trong `AdminDashboard.tsx`.
 */
function TrendChart({
  data,
  granularity,
}: {
  data: RevenuePeriodResponse[];
  granularity: ReportGranularity;
}) {
  const W = 720;
  const H = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 52 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.grossRevenue, d.netRevenue)),
    1,
  );

  const stepX = data.length > 1 ? chartW / data.length : chartW;
  const barW = Math.max(4, Math.min(38, stepX * 0.5));

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX + stepX / 2;
    const y = padding.top + chartH - (d.netRevenue / maxValue) * chartH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
      : "";

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px] h-52"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Lưới ngang + nhãn trục Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
          const y = padding.top + chartH * g;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={W - padding.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-ink/10"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[9px] fill-ink-muted"
              >
                {compactVND(maxValue * (1 - g))}
              </text>
            </g>
          );
        })}

        {/* Cột gross */}
        {data.map((d, i) => {
          const h = (d.grossRevenue / maxValue) * chartH;
          const x = padding.left + i * stepX + (stepX - barW) / 2;
          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={padding.top + chartH - h}
              width={barW}
              height={Math.max(0, h)}
              fill="rgb(203 213 225)"
              rx="2"
            >
              <title>{`${d.period} — gross ${compactVND(d.grossRevenue)}`}</title>
            </rect>
          );
        })}

        {/* Đường net */}
        {points.length > 0 && (
          <>
            <path d={areaPath} fill="url(#netGrad)" />
            <path
              d={linePath}
              fill="none"
              stroke="rgb(37 99 235)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={`pt-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="white"
                  stroke="rgb(37 99 235)"
                  strokeWidth="2"
                />
                <title>{`${p.period} — net ${compactVND(p.netRevenue)} · ${p.invoiceCount} hóa đơn`}</title>
              </g>
            ))}
          </>
        )}

        {/* Nhãn trục X */}
        {data.map((d, i) => (
          <text
            key={`lb-${i}`}
            x={padding.left + i * stepX + stepX / 2}
            y={H - 8}
            textAnchor="middle"
            className="text-[9px] fill-ink-muted"
          >
            {formatPeriodLabel(d.period, granularity)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Biểu đồ tròn phân bổ phương thức thanh toán (SVG thuần). */
function PaymentDonut({ data }: { data: PaymentBreakdownResponse[] }) {
  const total = data.reduce((sum, p) => sum + p.collectedAmount, 0);
  if (total <= 0) return null;

  const R = 46;
  const STROKE = 16;
  const C = 2 * Math.PI * R;

  let offset = 0;

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="rgb(241 245 249)"
          strokeWidth={STROKE}
        />
        {data.map((p) => {
          const portion = p.collectedAmount / total;
          const dash = portion * C;
          const el = (
            <circle
              key={p.paymentMethod}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={PAYMENT_COLORS[p.paymentMethod] ?? "rgb(100 116 139)"}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
    </div>
  );
}
