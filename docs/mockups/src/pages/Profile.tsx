import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  IconUser,
  IconPackage,
  IconMapPin,
  IconCar,
  IconCheckCircle,
  IconClock,
  IconArrowRight,
  IconNote,
  IconShield,
  IconStar,
  IconCash,
  IconTruck,
  IconClose,
  IconRefresh,
  IconPlus,
  IconArrowLeft,
  IconCalendar,
  IconSale,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { useToast } from "../components/Toast";
import { useAuth } from "../data/authStore";
import {
  getUserOrders,
  getUserAddresses,
  getUserVehicles,
} from "../data/authStore";
import type {
  Order,
  OrderStatus,
  Address,
  Vehicle,
} from "../data/mock";
import { formatCompactVND, formatFullVND } from "../data/cartStore";

// =========================
// Tab definitions
// =========================
type TabId = "info" | "orders" | "vehicles" | "addresses";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "info", label: "Thông tin", icon: <IconUser size={18} /> },
  { id: "orders", label: "Đơn hàng", icon: <IconPackage size={18} /> },
  { id: "vehicles", label: "Xe của tôi", icon: <IconCar size={18} /> },
  { id: "addresses", label: "Địa chỉ", icon: <IconMapPin size={18} /> },
];

// =========================
// Main component
// =========================
export default function Profile() {
  const { user, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const t = useToast();

  // Active tab — lấy từ URL hoặc mặc định "info"
  const activeTab = (params.get("tab") as TabId) || "info";

  const setTab = (id: TabId) => {
    setParams({ tab: id }, { replace: true });
  };

  // Nếu chưa đăng nhập → redirect về /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Pre-fetch per-user data
  const orders = useMemo(() => getUserOrders(user.id), [user.id]);
  const addresses = useMemo(() => getUserAddresses(user.id), [user.id]);
  const vehicles = useMemo(() => getUserVehicles(user.id), [user.id]);

  const handleLogout = () => {
    logout();
    t.info("Đã đăng xuất");
  };

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Tài khoản</span>
      </nav>

      {/* Header card */}
      <Card className="overflow-hidden mb-6">
        <div className="bg-gradient-to-br from-primary to-primary-hover p-6 md:p-8 text-white">
          <div className="flex items-start gap-4 flex-wrap">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-white/20 shadow-cardHover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {user.name}
                </h1>
                <TierBadge tier={user.tier} />
              </div>
              <div className="text-white/85 text-sm mb-4">
                {user.email} · {user.phone}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/85">
                <div className="flex items-center gap-1">
                  <IconCalendar size={14} />
                  Thành viên từ {user.memberSince}
                </div>
                <div className="flex items-center gap-1">
                  <IconStar size={14} className="text-accent" />
                  {user.loyaltyPoints.toLocaleString("vi-VN")} điểm thưởng
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/cart">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/40 text-white hover:bg-white/15"
                >
                  <IconPackage size={16} /> Giỏ hàng
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/40 text-white hover:bg-white/15"
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-ink/10 bg-white">
          <Stat
            icon={<IconPackage size={20} />}
            label="Đơn hàng"
            value={orders.length.toString()}
          />
          <Stat
            icon={<IconCar size={20} />}
            label="Xe đã đăng ký"
            value={vehicles.length.toString()}
          />
          <Stat
            icon={<IconSale size={20} />}
            label="Tổng chi tiêu"
            value={formatCompactVND(
              orders.reduce((s, o) => s + o.totalVND, 0),
            )}
          />
        </div>
      </Card>

      {/* Tabs (desktop horizontal, mobile horizontal-scroll chips) */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0 border-b border-ink/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={[
              "shrink-0 flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === "orders" && orders.length > 0 && (
              <span className="px-1.5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center">
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "info" && <InfoTab />}
        {activeTab === "orders" && <OrdersTab orders={orders} />}
        {activeTab === "vehicles" && (
          <VehiclesTab vehicles={vehicles} />
        )}
        {activeTab === "addresses" && (
          <AddressesTab addresses={addresses} />
        )}
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 md:p-5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs text-ink-muted">{label}</div>
        <div className="font-bold text-lg text-ink">{value}</div>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: "Thành viên" | "Bạc" | "Vàng" | "Bạch kim" }) {
  const styles: Record<typeof tier, string> = {
    "Thành viên": "bg-white/20 text-white",
    "Bạc": "bg-gray-300/30 text-white",
    "Vàng": "bg-accent text-ink",
    "Bạch kim": "bg-gradient-to-r from-purple-400 to-pink-400 text-white",
  };
  return (
    <span className={["px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide", styles[tier]].join(" ")}>
      <IconShield size={11} className="inline -mt-0.5 mr-0.5" />
      {tier}
    </span>
  );
}

// =========================
// Tab: Thông tin
// =========================
function InfoTab() {
  const { user, updateProfile } = useAuth();
  const t = useToast();

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
      });
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Mock async
    setTimeout(() => {
      updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setSaving(false);
      t.success("Đã cập nhật thông tin");
    }, 600);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Form */}
      <Card className="lg:col-span-2">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Thông tin cá nhân</h2>
            <Link to="/" className="text-xs text-ink-muted hover:text-primary">
              <IconArrowLeft size={12} className="inline" /> Về trang chủ
            </Link>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Họ và tên"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              leftIcon={<IconUser size={18} />}
              required
            />
            <Input
              type="email"
              label="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              leftIcon={<IconNote size={18} />}
              required
            />
            <Input
              label="Số điện thoại"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
              leftIcon={<IconMapPin size={18} />}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <IconRefresh size={16} className="animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <IconCheckCircle size={16} />
                    Lưu thay đổi
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    name: user?.name ?? "",
                    email: user?.email ?? "",
                    phone: user?.phone ?? "",
                  })
                }
              >
                Huỷ
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Sidebar — security, tier, quick links */}
      <div className="space-y-4">
        <Card>
          <div className="p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <IconShield size={16} className="text-primary" />
              Bảo mật
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span>Mật khẩu</span>
                <button className="text-xs text-primary hover:underline font-medium">
                  Đổi
                </button>
              </li>
              <li className="flex items-center justify-between">
                <span>Xác thực 2 yếu tố</span>
                <Badge tone="warning">Tắt</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>Phiên đang đăng nhập</span>
                <span className="text-xs text-ink-muted">1 thiết bị</span>
              </li>
            </ul>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <IconStar size={16} className="text-accent" />
              Ưu đãi thành viên
            </h3>
            <p className="text-sm text-ink-light mb-3">
              Tích luỹ điểm thưởng qua mỗi đơn hàng. Đổi điểm lấy voucher,
              phụ kiện miễn phí, hoặc giảm giá dịch vụ.
            </p>
            <Link to="/services">
              <Button variant="outline" size="sm" fullWidth>
                Khám phá ưu đãi <IconArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// =========================
// Tab: Đơn hàng
// =========================
function OrdersTab({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | "all", number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      shipping: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const o of orders) counts[o.status]++;
    return counts;
  }, [orders]);

  return (
    <div>
      {/* Status quick filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {[
          { id: "all" as const, label: "Tất cả" },
          { id: "pending" as const, label: "Chờ xác nhận" },
          { id: "shipping" as const, label: "Đang giao" },
          { id: "completed" as const, label: "Hoàn thành" },
          { id: "cancelled" as const, label: "Đã huỷ" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            disabled={statusCounts[s.id] === 0 && s.id !== "all"}
            className={[
              "shrink-0 px-3 h-9 rounded-full text-sm font-medium border transition-colors disabled:cursor-not-allowed",
              statusFilter === s.id
                ? "bg-primary text-white border-primary"
                : "bg-white text-ink border-ink/15 hover:bg-bgsoft disabled:opacity-40",
            ].join(" ")}
          >
            {s.label}
            <span
              className={[
                "ml-1.5 px-1.5 h-5 rounded-full text-[11px] inline-flex items-center justify-center",
                statusFilter === s.id
                  ? "bg-white/20 text-white"
                  : "bg-bgsoft text-ink-muted",
              ].join(" ")}
            >
              {statusCounts[s.id]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const t = useToast();
  const [expanded, setExpanded] = useState(false);

  const handleReorder = () => {
    t.info("Đã thêm các sản phẩm trong đơn vào giỏ hàng (mock)");
  };

  return (
    <Card>
      {/* Header */}
      <div className="p-4 md:p-5 flex items-start gap-4 flex-wrap border-b border-ink/8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-ink">{order.id}</h3>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="text-xs text-ink-muted flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <IconCalendar size={12} />
              {order.date}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <IconCash size={12} />
              {order.paymentMethod}
            </span>
            <span>·</span>
            <span>{order.items.length} sản phẩm</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-muted">Tổng</div>
          <div className="text-primary font-bold text-lg">
            {formatCompactVND(order.totalVND)}
          </div>
        </div>
      </div>

      {/* Items (collapsed by default) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 md:px-5 py-3 flex items-center justify-between text-sm text-ink-light hover:bg-bgsoft/40 transition-colors"
      >
        <span>
          {expanded ? "Thu gọn" : "Xem chi tiết"} đơn hàng
        </span>
        <IconArrowRight
          size={14}
          className={[
            "transition-transform",
            expanded ? "rotate-90" : "",
          ].join(" ")}
        />
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-5 space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.itemId} className="flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover bg-bgsoft shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink text-sm line-clamp-1">
                    {item.name}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {formatCompactVND(item.priceVND)} × {item.qty}
                  </div>
                </div>
                <div className="text-sm font-semibold text-ink shrink-0">
                  {formatCompactVND(item.priceVND * item.qty)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t border-ink/8 pt-3 text-sm space-y-1.5">
            <Row label="Tạm tính" value={formatFullVND(order.totalVND - order.shippingVND)} />
            <Row label="Phí vận chuyển" value={order.shippingVND === 0 ? "Miễn phí" : formatFullVND(order.shippingVND)} />
            <Row label="Tổng cộng" value={formatFullVND(order.totalVND)} bold />
          </div>

          {/* Address */}
          <div className="bg-bgsoft/50 rounded-xl p-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-1">
              Địa chỉ giao hàng
            </div>
            <div className="text-ink">{order.address}</div>
          </div>

          {/* Tracking */}
          {order.trackingNote && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm flex items-start gap-2">
              <IconTruck size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-ink">Vận chuyển</div>
                <div className="text-ink-light">{order.trackingNote}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-ink/8">
            {order.status === "shipping" && (
              <Button variant="outline" size="sm">
                <IconMapPin size={14} />
                Theo dõi đơn
              </Button>
            )}
            {order.status === "completed" && (
              <Button variant="outline" size="sm" onClick={handleReorder}>
                <IconRefresh size={14} />
                Mua lại
              </Button>
            )}
            <Button variant="ghost" size="sm">
              Liên hệ CSKH
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { tone: "default" | "primary" | "warning" | "accent"; label: string; icon: React.ReactNode }> = {
    pending: {
      tone: "warning",
      label: "Chờ xác nhận",
      icon: <IconClock size={11} />,
    },
    confirmed: {
      tone: "primary",
      label: "Đã xác nhận",
      icon: <IconCheckCircle size={11} />,
    },
    shipping: {
      tone: "primary",
      label: "Đang giao",
      icon: <IconTruck size={11} />,
    },
    completed: {
      tone: "accent",
      label: "Hoàn thành",
      icon: <IconCheckCircle size={11} />,
    },
    cancelled: {
      tone: "default",
      label: "Đã huỷ",
      icon: <IconClose size={11} />,
    },
  };
  const c = config[status];
  return (
    <Badge tone={c.tone}>
      {c.icon} {c.label}
    </Badge>
  );
}

function EmptyOrders() {
  return (
    <Card>
      <div className="p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
          <IconPackage size={32} className="text-ink-muted" />
        </div>
        <p className="font-semibold text-lg mb-1">Chưa có đơn hàng nào</p>
        <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
          Khám phá phụ kiện chính hãng hoặc đặt lịch dịch vụ để bắt đầu.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/parts">
            <Button>Mua phụ kiện</Button>
          </Link>
          <Link to="/services">
            <Button variant="outline">Đặt dịch vụ</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-semibold text-ink" : "text-ink-light"}>
        {label}
      </span>
      <span className={bold ? "font-bold text-primary" : "text-ink"}>
        {value}
      </span>
    </div>
  );
}

// =========================
// Tab: Xe của tôi
// =========================
function VehiclesTab({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Xe đã đăng ký ({vehicles.length})</h2>
        <Button size="sm">
          <IconPlus size={16} />
          Thêm xe
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-3">
              <IconCar size={32} className="text-ink-muted" />
            </div>
            <p className="font-semibold mb-1">Chưa có xe nào</p>
            <p className="text-sm text-ink-light">
              Đăng ký xe để AutoCare gợi ý phụ kiện/dịch vụ phù hợp.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="aspect-[16/9] overflow-hidden bg-bgsoft relative">
                <img
                  src={v.image}
                  alt={v.nickname}
                  className="w-full h-full object-cover"
                />
                {v.color && (
                  <Badge
                    tone="default"
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur"
                  >
                    {v.color}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-ink">{v.nickname}</h3>
                  <span className="text-xs text-ink-muted">{v.year}</span>
                </div>
                <div className="text-sm text-ink-light mb-3">
                  {v.brand} {v.model}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="Biển số" value={v.plate} />
                  <Info
                    label="Odo"
                    value={`${v.odoKm.toLocaleString("vi-VN")} km`}
                  />
                  {v.lastServiceAt && (
                    <Info
                      label="Bảo dưỡng gần nhất"
                      value={v.lastServiceAt}
                      full
                    />
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-ink/8 flex gap-2">
                  <Link to="/services" className="flex-1">
                    <Button variant="outline" size="sm" fullWidth>
                      Đặt lịch
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm">
                    Sửa
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-0.5">
        {label}
      </div>
      <div className="text-ink font-medium">{value}</div>
    </div>
  );
}

// =========================
// Tab: Địa chỉ
// =========================
function AddressesTab({ addresses }: { addresses: Address[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Sổ địa chỉ ({addresses.length})</h2>
        <Button size="sm">
          <IconPlus size={16} />
          Thêm địa chỉ
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-3">
              <IconMapPin size={32} className="text-ink-muted" />
            </div>
            <p className="font-semibold mb-1">Chưa có địa chỉ nào</p>
            <p className="text-sm text-ink-light">
              Thêm địa chỉ để đặt hàng nhanh hơn.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{a.label}</h3>
                    {a.isDefault && (
                      <Badge tone="primary">
                        <IconCheckCircle size={11} /> Mặc định
                      </Badge>
                    )}
                  </div>
                  <button className="text-xs text-primary hover:underline font-medium">
                    Sửa
                  </button>
                </div>
                <div className="text-sm font-medium text-ink mb-1">
                  {a.recipient}
                </div>
                <div className="text-sm text-ink-light mb-2">{a.phone}</div>
                <p className="text-sm text-ink-light leading-relaxed">
                  {a.fullAddress}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}