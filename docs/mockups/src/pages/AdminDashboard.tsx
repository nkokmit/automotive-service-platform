import { Link } from "react-router-dom";
import {
  IconShoppingBag,
  IconBuilding,
  IconWrench,
  IconPackage,
  IconUsers,
  IconArrowRight,
  IconArrowUpRight,
  IconArrowDownRight,
  IconChart,
  IconCalendar,
  IconPlus,
  IconCheck,
  IconBolt,
  IconCar,
  IconStar,
  IconSparkles,
  IconWarning,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import {
  adminKpis,
  revenueData,
  topParts,
  topServices,
  recentActivities,
  adminOrders,
  formatKpiVND,
  getStatusLabel,
  getStatusTone,
  relativeTime,
} from "../data/adminMock";
import {
  formatCompactVND as compactVND,
} from "../data/cartStore";

// =========================
// Dashboard — trang tổng quan cho admin
// =========================

export default function AdminDashboard() {
  const recentOrders = adminOrders.slice(0, 6);
  const newOrdersCount = adminOrders.filter((o) => o.status === "pending").length;
  const completedCount = adminOrders.filter((o) => o.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* ============= Welcome / Page header ============= */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
            <IconCalendar size={12} />
            Thứ 7, 03 tháng 10, 2026
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-ink-light mt-1">
            Xin chào quay lại! Hôm nay có{" "}
            <span className="font-semibold text-primary">{newOrdersCount} đơn mới</span>{" "}
            và {completedCount} đơn đã hoàn tất.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md">
            <IconCalendar size={14} />
            Tháng này
          </Button>
          <Link to="/admin/orders">
            <Button size="md">
              <IconPlus size={14} />
              Tạo đơn
            </Button>
          </Link>
        </div>
      </div>

      {/* ============= KPI Cards ============= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminKpis.map((k) => (
          <KpiCard key={k.id} kpi={k} />
        ))}
      </div>

      {/* ============= Revenue chart + Top services ============= */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart - 2/3 */}
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
                    Tổng 12 tháng: {formatKpiVND(revenueData.reduce((s, r) => s + r.revenue, 0) * 1_000_000)}
                  </p>
                </div>
                <Badge tone="accent">
                  <IconArrowUpRight size={11} />
                  +12,5% YoY
                </Badge>
              </div>
              <RevenueChart data={revenueData} />
            </div>
          </Card>
        </div>

        {/* Top services - 1/3 */}
        <Card hover={false}>
          <div className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <IconWrench size={18} className="text-primary" />
              Top dịch vụ
            </h2>
            <ul className="space-y-3">
              {topServices.map((s, idx) => (
                <li key={s.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {s.name}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {s.bookings.toLocaleString("vi-VN")} lượt · {formatKpiVND(s.revenue)}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-xs">
                    <IconStar size={10} className="text-accent-hover" />
                    <span className="font-semibold">{s.rating}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* ============= Recent orders + Recent activity ============= */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent orders - 2/3 */}
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <IconShoppingBag size={18} className="text-primary" />
                  Đơn hàng gần đây
                </h2>
                <Link
                  to="/admin/orders"
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  Xem tất cả
                  <IconArrowRight size={11} />
                </Link>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted uppercase">
                      <th className="font-medium px-2 py-2">Mã đơn</th>
                      <th className="font-medium px-2 py-2">Khách hàng</th>
                      <th className="font-medium px-2 py-2 hidden sm:table-cell">SL</th>
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
                        <td className="px-2 py-2.5">
                          <div className="font-medium text-ink line-clamp-1">
                            {o.customer}
                          </div>
                          <div className="text-xs text-ink-muted line-clamp-1">
                            {o.city} · {o.date}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center text-ink-muted hidden sm:table-cell">
                          {o.itemsCount}
                        </td>
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
            <ol className="space-y-3">
              {recentActivities.slice(0, 7).map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <div
                    className={[
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      a.tone === "primary" && "bg-primary/10 text-primary",
                      a.tone === "accent" && "bg-accent text-ink",
                      a.tone === "success" && "bg-emerald-100 text-emerald-700",
                      a.tone === "warning" && "bg-amber-100 text-amber-700",
                      a.tone === "neutral" && "bg-bgsoft text-ink-muted",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {a.kind === "order_created" && <IconShoppingBag size={14} />}
                    {a.kind === "order_completed" && <IconCheck size={14} />}
                    {a.kind === "new_user" && <IconUsers size={14} />}
                    {a.kind === "new_garage" && <IconBuilding size={14} />}
                    {a.kind === "service_booked" && <IconWrench size={14} />}
                    {a.kind === "review_posted" && <IconStar size={14} />}
                    {a.kind === "garage_approved" && <IconCheck size={14} />}
                    {a.kind === "low_stock" && <IconWarning size={14} />}
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
          </div>
        </Card>
      </div>

      {/* ============= Top products + Quick links ============= */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top parts - 2/3 */}
        <div className="lg:col-span-2">
          <Card hover={false}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <IconPackage size={18} className="text-primary" />
                  Phụ tùng bán chạy
                </h2>
                <Link
                  to="/admin/parts"
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  Quản lý kho
                  <IconArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-2">
                {topParts.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-bgsoft/40"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {p.sold.toLocaleString("vi-VN")} đã bán
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">
                        {formatKpiVND(p.revenue)}
                      </div>
                      <div
                        className={[
                          "text-[10px] font-semibold inline-flex items-center gap-0.5",
                          p.growth >= 0 ? "text-emerald-600" : "text-red-500",
                        ].join(" ")}
                      >
                        {p.growth >= 0 ? (
                          <IconArrowUpRight size={9} />
                        ) : (
                          <IconArrowDownRight size={9} />
                        )}
                        {Math.abs(p.growth)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick links - 1/3 */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <IconBolt size={18} className="text-primary" />
            Truy cập nhanh
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink
              to="/admin/garages"
              icon={<IconBuilding size={18} />}
              label="Garage"
              desc="4 đang hoạt động"
              tone="primary"
            />
            <QuickLink
              to="/admin/services"
              icon={<IconWrench size={18} />}
              label="Dịch vụ"
              desc="8 đang cung cấp"
              tone="accent"
            />
            <QuickLink
              to="/admin/parts"
              icon={<IconPackage size={18} />}
              label="Phụ tùng"
              desc="8 trong kho"
              tone="success"
            />
            <QuickLink
              to="/admin/users"
              icon={<IconUsers size={18} />}
              label="Người dùng"
              desc="12 tài khoản"
              tone="warning"
            />
          </div>

          <Card hover={false} className="bg-gradient-to-br from-primary to-primary-hover text-white border-0">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <IconCar size={16} />
                <span className="text-xs font-medium opacity-80 uppercase tracking-wider">
                  Mua xe
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{adminOrders.length}</div>
              <div className="text-xs opacity-80">Đơn mua xe đang chờ duyệt</div>
              <Link
                to="/cars"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                Xem danh sách xe
                <IconArrowRight size={11} />
              </Link>
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

function KpiCard({ kpi }: { kpi: typeof adminKpis[number] }) {
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
          <span
            className={[
              "text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5",
              positive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700",
            ].join(" ")}
          >
            {positive ? <IconArrowUpRight size={9} /> : <IconArrowDownRight size={9} />}
            {Math.abs(kpi.delta)}%
          </span>
        </div>
        <div className="text-2xl font-bold text-ink leading-tight">
          {kpi.value}
        </div>
        <div className="text-xs text-ink-muted mt-1">{kpi.label}</div>
      </div>
    </Card>
  );
}

function RevenueChart({ data }: { data: typeof revenueData }) {
  const maxRev = Math.max(...data.map((d) => d.revenue));
  const W = 600;
  const H = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;
  const stepX = chartW / (data.length - 1);

  // Tạo path SVG cho line
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

        {/* Gridlines */}
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

        {/* Y-axis labels */}
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

        {/* Area */}
        <path d={areaPath} fill="url(#revGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="rgb(37 99 235)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
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
            <title>{`${p.month}: ${p.revenue}tr · ${p.orders} đơn`}</title>
          </g>
        ))}

        {/* X-axis labels */}
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

function StatusBadge({ status }: { status: typeof adminOrders[number]["status"] }) {
  const tone = getStatusTone(status);
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-red-100 text-red-700",
  } as const;
  return (
    <span
      className={[
        "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        toneMap[tone],
      ].join(" ")}
    >
      {getStatusLabel(status)}
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