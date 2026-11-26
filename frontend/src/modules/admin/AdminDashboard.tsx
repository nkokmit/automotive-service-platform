import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  IconShoppingBag,
  IconWrench,
  IconPackage,
  IconUsers,
  IconArrowRight,
  IconArrowUpRight,
  IconArrowDownRight,
  IconChart,
  IconCalendar,
  IconPlus,
  IconBolt,
  IconCar,
  IconSparkles,
  IconRefresh,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import {
  useAdminDashboard,
  type DashboardKpi,
} from "./useAdminDashboard";
import { formatCompactVND as compactVND } from "../../utils/format";

// =========================
// Dashboard — trang tổng quan cho admin
// Nguồn: billing-service (hóa đơn) + work-order-service + booking-service
//         + user-service. Không có endpoint "dashboard" nên phải tổng hợp.
// =========================

/** Nhãn + tone cho trạng thái hóa đơn. */
const INVOICE_STATUS: Record<string, { label: string; tone: string }> = {
  UNPAID: { label: "Chưa thanh toán", tone: "bg-orange-100 text-orange-700" },
  PARTIALLY_PAID: {
    label: "Thanh toán một phần",
    tone: "bg-primary/10 text-primary",
  },
  PAID: { label: "Đã thanh toán", tone: "bg-emerald-100 text-emerald-700" },
  VOID: { label: "Đã huỷ", tone: "bg-red-100 text-red-700" },
};

export default function AdminDashboard() {
  const {
    kpis,
    revenueByMonth,
    recentOrders,
    activities,
    totals,
    loading,
    errors,
    reload,
  } = useAdminDashboard();

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [],
  );

  const newOrdersCount = totals.workOrders;

  const totalRevenue = useMemo(
    () => revenueByMonth.reduce((s, r) => s + r.revenue, 0) * 1_000_000,
    [revenueByMonth],
  );

  return (
    <div className="space-y-6">
      {/* ============= Welcome / Page header ============= */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
            <IconCalendar size={12} />
            {today}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-ink-light mt-1">
            Hệ thống đang ghi nhận{" "}
            <span className="font-semibold text-primary">
              {newOrdersCount} phiếu sửa chữa
            </span>{" "}
            và {totals.bookings} lịch hẹn.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={reload}>
            <IconRefresh size={14} />
            {loading ? "Đang tải..." : "Làm mới"}
          </Button>
          <Link to="/admin/work-orders">
            <Button size="md">
              <IconPlus size={14} />
              Tạo phiếu sửa chữa
            </Button>
          </Link>
        </div>
      </div>

      {/* ============= Cảnh báo nguồn dữ liệu ============= */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-medium mb-1">
            Một số số liệu không tải được từ máy chủ:
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ============= KPI Cards ============= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} />
        ))}
      </div>

      {/* ============= Revenue chart ============= */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <IconChart size={18} className="text-primary" />
                    Doanh thu 12 tháng gần nhất
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Tổng 12 tháng: {compactVND(totalRevenue)}
                  </p>
                </div>
                <Badge tone="accent">
                  <IconArrowUpRight size={11} />
                  Dữ liệu thật
                </Badge>
              </div>
              {revenueByMonth.length > 0 ? (
                <RevenueChart data={revenueByMonth} />
              ) : (
                <div className="h-44 flex items-center justify-center text-sm text-ink-muted">
                  Chưa có dữ liệu doanh thu
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Số liệu tổng quan */}
        <Card hover={false}>
          <div className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <IconBolt size={18} className="text-primary" />
              Tổng quan hệ thống
            </h2>
            <ul className="space-y-3">
              <SummaryRow
                icon={<IconShoppingBag size={14} />}
                label="Hóa đơn"
                value={totals.invoices}
              />
              <SummaryRow
                icon={<IconWrench size={14} />}
                label="Phiếu sửa chữa"
                value={totals.workOrders}
              />
              <SummaryRow
                icon={<IconCalendar size={14} />}
                label="Lịch hẹn"
                value={totals.bookings}
              />
              <SummaryRow
                icon={<IconUsers size={14} />}
                label="Tài khoản"
                value={totals.users}
              />
            </ul>
          </div>
        </Card>
      </div>

      {/* ============= Recent orders + Recent activity ============= */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <IconShoppingBag size={18} className="text-primary" />
                  Hóa đơn gần đây
                </h2>
                <Link
                  to="/admin/invoices"
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  Xem tất cả
                  <IconArrowRight size={11} />
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-muted">
                  Chưa có hóa đơn nào
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-ink-muted uppercase">
                        <th className="font-medium px-2 py-2">Mã hóa đơn</th>
                        <th className="font-medium px-2 py-2">Ngày</th>
                        <th className="font-medium px-2 py-2 text-right">Tổng</th>
                        <th className="font-medium px-2 py-2 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id} className="border-t border-ink/8 hover:bg-bgsoft/40">
                          <td className="px-2 py-2.5 font-mono text-xs font-semibold">
                            {o.id}
                          </td>
                          <td className="px-2 py-2.5 text-ink-muted">{o.date}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-primary whitespace-nowrap">
                            {compactVND(o.totalVND)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <StatusBadge status={o.status} />
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

        {/* Recent activity - 1/3 */}
        <Card hover={false}>
          <div className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <IconSparkles size={18} className="text-primary" />
              Hoạt động gần đây
            </h2>
            {activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                Chưa có hoạt động nào
              </div>
            ) : (
              <ol className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <div
                      className={[
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        a.kind === "invoice" && "bg-primary/10 text-primary",
                        a.kind === "work_order" && "bg-accent text-ink",
                        a.kind === "booking" && "bg-emerald-100 text-emerald-700",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {a.kind === "invoice" && <IconShoppingBag size={14} />}
                      {a.kind === "work_order" && <IconWrench size={14} />}
                      {a.kind === "booking" && <IconCalendar size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">
                        {a.title}
                      </div>
                      <div className="text-xs text-ink-muted line-clamp-1">
                        {a.description}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {relativeTime(a.timestamp)} · {a.actor}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>

      {/* ============= Quick links ============= */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <IconPackage size={18} className="text-primary" />
                Quản lý nhanh
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickLink
                  to="/admin/services"
                  icon={<IconWrench size={18} />}
                  label="Dịch vụ"
                  desc="Quản lý catalog"
                  tone="accent"
                />
                <QuickLink
                  to="/admin/parts"
                  icon={<IconPackage size={18} />}
                  label="Phụ tùng"
                  desc="Quản lý kho"
                  tone="success"
                />
                <QuickLink
                  to="/admin/work-orders"
                  icon={<IconShoppingBag size={18} />}
                  label="Sửa chữa"
                  desc="Phiếu sửa chữa"
                  tone="primary"
                />
                <QuickLink
                  to="/admin/users"
                  icon={<IconUsers size={18} />}
                  label="Người dùng"
                  desc={`${totals.users} tài khoản`}
                  tone="warning"
                />
              </div>
            </div>
          </Card>
        </div>

        <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-white border-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <IconCar size={16} />
              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">
                Lịch hẹn
              </span>
            </div>
            <div className="text-2xl font-bold mb-1">{totals.bookings}</div>
            <div className="text-xs opacity-80">Lịch hẹn đang chờ xử lý</div>
            <Link
              to="/admin/bookings"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              Xem danh sách lịch hẹn
              <IconArrowRight size={11} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const positive = kpi.delta >= 0;
  const iconMap = {
    revenue: <IconBolt size={18} className="text-white" />,
    orders: <IconShoppingBag size={18} className="text-white" />,
    users: <IconUsers size={18} className="text-white" />,
    conversion: <IconChart size={18} className="text-white" />,
  };
  const toneColorMap = {
    primary: "bg-primary",
    accent: "bg-amber-500",
    success: "bg-emerald-500",
    warning: "bg-orange-500",
  };

  return (
    <Card hover={false}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div
            className={[
              "w-10 h-10 rounded-xl flex items-center justify-center",
              toneColorMap[kpi.tone],
            ].join(" ")}
          >
            {iconMap[kpi.icon]}
          </div>
          {kpi.delta !== 0 && (
            <span
              className={[
                "text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5",
                positive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700",
              ].join(" ")}
            >
              {positive ? (
                <IconArrowUpRight size={9} />
              ) : (
                <IconArrowDownRight size={9} />
              )}
              {Math.abs(kpi.delta)}%
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-ink leading-tight">
          {kpi.value}
        </div>
        <div className="text-xs text-ink-muted mt-1">{kpi.label}</div>
      </div>
    </Card>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold">
        {new Intl.NumberFormat("vi-VN").format(value)}
      </span>
    </li>
  );
}

function RevenueChart({
  data,
}: {
  data: { month: string; revenue: number; orders: number }[];
}) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const W = 600;
  const H = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (d.revenue / maxRev) * chartH;
    return { x, y, ...d };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-44"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
          const y = padding.top + chartH * g;
          return (
            <line
              key={i}
              x1={padding.left}
              x2={W - padding.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-ink/10"
            />
          );
        })}

        {[1, 0.5, 0].map((g, i) => {
          const y = padding.top + chartH * (1 - g);
          return (
            <text
              key={i}
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              className="text-[9px] fill-ink-muted"
            >
              {Math.round(maxRev * g)}tr
            </text>
          );
        })}

        <path d={areaPath} fill="url(#revGrad)" />

        <path
          d={linePath}
          fill="none"
          stroke="rgb(37 99 235)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="3"
              fill="white"
              stroke="rgb(37 99 235)"
              strokeWidth="2"
            />
            <title>{`${p.month}: ${p.revenue}tr · ${p.orders} hóa đơn`}</title>
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            className="text-[9px] fill-ink-muted"
          >
            {p.month}
          </text>
        ))}
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = INVOICE_STATUS[status] ?? {
    label: status,
    tone: "bg-bgsoft text-ink-muted",
  };
  return (
    <span
      className={[
        "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        meta.tone,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}

function QuickLink({
  to,
  icon,
  label,
  desc,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  tone: "primary" | "accent" | "success" | "warning";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-orange-100 text-orange-700",
  };
  return (
    <Link
      to={to}
      className="block p-3 bg-white border border-ink/8 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className={["w-9 h-9 rounded-lg flex items-center justify-center mb-2", toneMap[tone]].join(" ")}>
        {icon}
      </div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[10px] text-ink-muted">{desc}</div>
    </Link>
  );
}

/** Thời gian tương đối so với hiện tại. */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}
