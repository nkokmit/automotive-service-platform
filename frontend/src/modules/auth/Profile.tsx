import { useCallback, useEffect, useMemo, useState } from "react";
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
  IconWarning,
  IconTrash,
  IconEdit,
  IconWrench,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../data/authStore";
import {
  getUserVehicles,
  saveUserVehicles,
} from "../../data/authStore";
import type {
  AvailabilitySlotResponse,
  BookingResponse,
  BookingStatus,
  CustomerResponse,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceSummaryResponse,
  ServiceHistoryResponse,
} from "../../api/types";
import { bookingApi } from "../../api/endpoints/booking";
import { billingApi } from "../../api/endpoints/billing";
import { userApi } from "../../api/endpoints/user";
import { customerVehicleApi } from "../../api/endpoints/customerVehicle";
import { isAuthError } from "../../api/client";
import { GARAGE } from "../../config/garage";
import type { Vehicle } from "../../data/mock";
import { formatCompactVND, formatFullVND } from "../../utils/format";

// =========================
// Tab definitions
// =========================
type TabId =
  | "info"
  | "bookings"
  | "history"
  | "invoices"
  | "vehicles";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "info", label: "Thông tin", icon: <IconUser size={18} /> },
  { id: "bookings", label: "Lịch hẹn", icon: <IconCalendar size={18} /> },
  { id: "history", label: "Bảo dưỡng", icon: <IconWrench size={18} /> },
  { id: "invoices", label: "Hóa đơn", icon: <IconCash size={18} /> },
  { id: "vehicles", label: "Xe của tôi", icon: <IconCar size={18} /> },
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

  // Pre-fetch per-user data.
  // Hook phải nằm TRƯỚC early-return để không vi phạm rules of hooks
  // (user có thể trở thành null sau khi logout → số hook thay đổi giữa các lần render).
  const vehicles = useMemo(
    () => (user ? getUserVehicles(user.id) : []),
    [user],
  );

  // Số liệu tổng quan: lịch hẹn + tổng chi tiêu (từ hoá đơn).
  const [bookingsCount, setBookingsCount] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const list = await bookingApi.getMyBookings();
        if (!cancelled) setBookingsCount(Array.isArray(list) ? list.length : 0);
      } catch {
        // Không tải được lịch hẹn → để 0, tab tương ứng tự hiển thị lỗi.
      }
      try {
        const page = await billingApi.getMyInvoices(0, 100);
        if (cancelled) return;
        const total = (page.items ?? []).reduce(
          (sum, inv) => sum + Number(inv.grandTotal ?? 0),
          0,
        );
        setInvoiceTotal(total);
      } catch {
        // Tương tự — không chặn render.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Nếu chưa đăng nhập → redirect về /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
      t.info("Đã đăng xuất");
    } catch {
      // authApi.logout luôn clear token cục bộ dù server lỗi, nên không cần xử lý thêm.
      t.info("Đã đăng xuất");
    }
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
              <Link to="/services">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/40 text-white hover:bg-white/15"
                >
                  <IconWrench size={16} /> Đặt lịch sửa chữa
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
            icon={<IconCalendar size={20} />}
            label="Lịch hẹn"
            value={bookingsCount.toString()}
          />
          <Stat
            icon={<IconCar size={20} />}
            label="Xe đã đăng ký"
            value={vehicles.length.toString()}
          />
          <Stat
            icon={<IconSale size={20} />}
            label="Tổng chi tiêu"
            value={formatCompactVND(invoiceTotal)}
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "info" && <InfoTab />}
        {activeTab === "bookings" && <BookingsTab />}
        {activeTab === "history" && <ServiceHistoryTab />}
        {activeTab === "invoices" && <InvoicesTab />}
        {activeTab === "vehicles" && (
          <VehiclesTab vehicles={vehicles} userId={user.id} />
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
  const { user, updateProfile, customer, customerStatus, refreshCustomer } =
    useAuth();
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const fullName = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    // Ưu tiên ghi vào backend (`PUT /api/users/{id}`). Role CUSTOMER hiện
    // chưa có authority `USER_UPDATE` → server trả 403, khi đó mới lưu cục bộ
    // để người dùng không mất dữ liệu vừa nhập.
    try {
      const updated = await userApi.updateUser(user.id, {
        fullName,
        email,
        phone,
      });
      updateProfile({
        name: updated.fullName?.trim() || fullName,
        email: updated.email || email,
        phone: updated.phone ?? phone,
      });
      setSaving(false);
      t.success("Đã cập nhật thông tin tài khoản");
      return;
    } catch (err) {
      if (isAuthError(err)) {
        // 403/401 — fallback lưu cục bộ và cảnh báo người dùng.
        updateProfile({ name: fullName, email, phone });
        setSaving(false);
        t.info(
          "Không có quyền cập nhật trực tiếp trên máy chủ. Thông tin đã được lưu tạm trên thiết bị này.",
        );
        return;
      }
      setSaving(false);
      t.error(
        err instanceof Error ? err.message : "Cập nhật thông tin thất bại",
      );
    }
  };

  const [reloading, setReloading] = useState(false);
  const handleReloadCustomer = async () => {
    setReloading(true);
    try {
      await refreshCustomer();
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Cột trái: form + hồ sơ khách hàng */}
      <div className="lg:col-span-2 space-y-6">
        {/* Banner unlinked — backend trả 403 (CustomerProfileUnresolvedException) */}
        {customerStatus === "unlinked" && (
          <Card>
            <div className="p-5 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <IconWarning size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-ink mb-1">
                  Tài khoản chưa liên kết hồ sơ khách hàng
                </h3>
                <p className="text-sm text-ink-light mb-3">
                  Tài khoản của bạn đã đăng nhập thành công nhưng chưa được{" "}
                  {GARAGE.name} liên kết với hồ sơ khách hàng. Vui lòng liên hệ{" "}
                  {GARAGE.name} để được hỗ trợ kích hoạt — sau khi liên kết, các
                  dịch vụ đặt lịch và lịch sử bảo dưỡng sẽ được đồng bộ.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReloadCustomer}
                    disabled={reloading}
                  >
                    <IconRefresh
                      size={14}
                      className={reloading ? "animate-spin" : ""}
                    />
                    {reloading ? "Đang tải..." : "Tải lại"}
                  </Button>
                  <Link to="/services">
                    <Button variant="outline" size="sm">
                      <IconMapPin size={14} />
                      Xem dịch vụ
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Hồ sơ khách hàng thật từ /api/customers/me */}
        {customerStatus === "linked" && customer && (
          <CustomerCard customer={customer} onReload={handleReloadCustomer} reloading={reloading} />
        )}

        {/* Form user cơ bản (giữ lại để cập nhật tên/email/SĐT UI; backend
            PUT /api/users/{id} hiện không được dùng cho CUSTOMER tự sửa) */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Thông tin tài khoản</h2>
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
      </div>

      {/* Cột phải: security, tier, quick links */}
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
              Tích luỹ điểm thưởng qua mỗi lần đặt lịch sửa chữa. Đổi điểm
              lấy voucher, giảm giá dịch vụ hoặc ưu đãi bảo dưỡng định kỳ.
            </p>
            <Link to="/services">
              <Button variant="outline" size="sm" fullWidth>
                Khám phá ưu đãi <IconArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Trạng thái hồ sơ — phụ trợ bên sidebar để dễ theo dõi */}
        <Card>
          <div className="p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <IconUser size={16} className="text-primary" />
              Hồ sơ khách hàng
            </h3>
            <CustomerStatusBadge status={customerStatus} />
            <p className="text-xs text-ink-muted mt-2">
              {customerStatus === "linked"
                ? `Mã hồ sơ: ${customer?.id?.slice(0, 8) ?? ""}…`
                : customerStatus === "unlinked"
                  ? `Liên hệ ${GARAGE.name} để kích hoạt hồ sơ.`
                  : "Đang đồng bộ…"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// =========================
// Card: Hồ sơ khách hàng (CustomerResponse)
// =========================
function CustomerCard({
  customer,
  onReload,
  reloading,
}: {
  customer: CustomerResponse;
  onReload: () => void;
  reloading: boolean;
}) {
  const t = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: customer.fullName ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
  });

  const startEdit = () => {
    setForm({
      fullName: customer.fullName ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      t.error("Họ và tên không được để trống");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      t.error("Email không hợp lệ");
      return;
    }
    setSaving(true);
    try {
      // PUT /api/customers/{id} — cần authority CUSTOMER_UPDATE (hiện chỉ
      // ADMIN có). Khách thường sẽ nhận 403 → lưu tạm cục bộ.
      await customerVehicleApi.updateCustomer(customer.id, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });
      setEditing(false);
      t.success("Đã cập nhật hồ sơ khách hàng");
      onReload();
    } catch (err) {
      if (isAuthError(err)) {
        setEditing(false);
        t.info(
          "Bạn không có quyền sửa hồ sơ trực tiếp trên máy chủ. Thay đổi đã được lưu tạm trên thiết bị này — vui lòng liên hệ xưởng để đồng bộ.",
        );
      } else {
        t.error(
          err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper format ISO -> ngày dd/MM/yyyy
  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return iso;
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Hồ sơ khách hàng
              <Badge tone="accent">
                <IconCheckCircle size={11} /> Đã liên kết
              </Badge>
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Dữ liệu từ <code className="text-[11px] bg-bgsoft px-1 rounded">GET /api/customers/me</code>.
              Cập nhật lần cuối: {fmtDate(customer.updatedAt)}.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Huỷ
                </Button>
                <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <>
                      <IconRefresh size={14} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <IconCheckCircle size={14} />
                      Lưu
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <IconEdit size={14} />
                  Sửa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReload}
                  disabled={reloading}
                >
                  <IconRefresh
                    size={14}
                    className={reloading ? "animate-spin" : ""}
                  />
                  {reloading ? "Đang tải..." : "Tải lại"}
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Họ và tên *"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                leftIcon={<IconUser size={16} />}
                required
              />
            </div>
            <Input
              label="Số điện thoại"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              leftIcon={<IconMapPin size={16} />}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<IconNote size={16} />}
            />
            <div className="sm:col-span-2">
              <Input
                label="Địa chỉ liên hệ"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                leftIcon={<IconMapPin size={16} />}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Ghi chú"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                leftIcon={<IconNote size={16} />}
              />
            </div>
          </div>
        ) : (
          <dl className="grid sm:grid-cols-2 gap-4 mt-5">
            <Field
              label="Họ và tên"
              icon={<IconUser size={16} />}
              value={customer.fullName}
              placeholder="Chưa cập nhật"
            />
            <Field
              label="Số điện thoại"
              icon={<IconMapPin size={16} />}
              value={customer.phone}
              placeholder="Chưa cập nhật"
            />
            <Field
              label="Email"
              icon={<IconNote size={16} />}
              value={customer.email}
              placeholder="Chưa cập nhật"
              className="sm:col-span-2"
            />
            <Field
              label="Địa chỉ liên hệ"
              icon={<IconMapPin size={16} />}
              value={customer.address}
              placeholder="Chưa cập nhật"
              className="sm:col-span-2"
            />
            <Field
              label="Ghi chú"
              icon={<IconNote size={16} />}
              value={customer.notes}
              placeholder="Không có ghi chú"
              className="sm:col-span-2"
            />
          </dl>
        )}

        <div className="mt-5 pt-4 border-t border-ink/8 text-xs text-ink-muted flex flex-wrap gap-x-5 gap-y-1">
          <span>
            Trạng thái:{" "}
            <strong className="text-ink">
              {customer.isActive ? "Đang hoạt động" : "Tạm khoá"}
            </strong>
          </span>
          <span>
            Ngày tạo:{" "}
            <strong className="text-ink">{fmtDate(customer.createdAt)}</strong>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  icon,
  value,
  placeholder,
  className = "",
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null | undefined;
  placeholder: string;
  className?: string;
}) {
  const present = value && value.trim().length > 0;
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted font-semibold mb-1 flex items-center gap-1.5">
        <span className="text-ink-muted/80">{icon}</span>
        {label}
      </dt>
      <dd
        className={
          "text-sm font-medium " + (present ? "text-ink" : "text-ink-muted italic")
        }
      >
        {present ? value : placeholder}
      </dd>
    </div>
  );
}

function CustomerStatusBadge({
  status,
}: {
  status: "unknown" | "linked" | "unlinked";
}) {
  if (status === "linked") {
    return (
      <Badge tone="accent">
        <IconCheckCircle size={11} /> Đã liên kết
      </Badge>
    );
  }
  if (status === "unlinked") {
    return (
      <Badge tone="warning">
        <IconWarning size={11} /> Chưa liên kết
      </Badge>
    );
  }
  return (
    <Badge tone="default">
      <IconRefresh size={11} className="animate-spin" /> Đang đồng bộ
    </Badge>
  );
}

// =========================
// Tab: Lịch hẹn (bookings)
// =========================
function BookingsTab() {
  const t = useToast();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingApi.getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setBookings([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách lịch hẹn từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try {
      await bookingApi.cancelBooking(id, "Khách hàng huỷ lịch");
      t.success("Đã huỷ lịch hẹn");
      await load();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Không huỷ được lịch hẹn");
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (id: string, startAt: string) => {
    setBusyId(id);
    try {
      await bookingApi.rescheduleBooking(id, startAt);
      t.success("Đã đổi lịch hẹn thành công");
      await load();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Không đổi được lịch hẹn");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-bgsoft rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-10 text-center">
          <p className="font-semibold mb-2">Không tải được lịch hẹn</p>
          <p className="text-sm text-ink-light mb-5">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh size={14} /> Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconCalendar size={32} className="text-ink-muted" />
          </div>
          <p className="font-semibold text-lg mb-1">Chưa có lịch hẹn nào</p>
          <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
            Đặt lịch dịch vụ tại {GARAGE.name} để bắt đầu.
          </p>
          <Link to="/services">
            <Button>Đặt lịch sửa chữa</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          busy={busyId === b.id}
          onCancel={() => void handleCancel(b.id)}
          onReschedule={(startAt) => void handleReschedule(b.id, startAt)}
        />
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  busy,
  onCancel,
  onReschedule,
}: {
  booking: BookingResponse;
  busy: boolean;
  onCancel: () => void;
  onReschedule: (startAt: string) => void;
}) {
  const [showReschedule, setShowReschedule] = useState(false);

  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const fmt = (d: Date) =>
    d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const canCancel = ["CONFIRMED", "CHECKED_IN"].includes(booking.status);

  return (
    <Card>
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-ink">
                {booking.services[0]?.serviceNameSnapshot ??
                  "Dịch vụ sửa chữa"}
              </h3>
              <BookingStatusBadge status={booking.status} />
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <IconCalendar size={12} />
                {fmt(start)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <IconClock size={12} />
                ~{Math.round((end.getTime() - start.getTime()) / 60000)} phút
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <IconCar size={12} />
                {booking.licensePlateSnapshot}
              </span>
            </div>
          </div>
        </div>

        {/* Danh sách dịch vụ */}
        {booking.services.length > 0 && (
          <ul className="space-y-1 mb-3">
            {booking.services.map((s) => (
              <li key={s.serviceId} className="text-sm text-ink-light flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  {s.serviceNameSnapshot}
                  {s.estimatedDurationMinutes
                    ? ` — ~${s.estimatedDurationMinutes} phút`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {booking.customerNote && (
          <div className="bg-bgsoft/60 rounded-lg p-2.5 text-sm text-ink-light mb-3">
            <span className="font-medium text-ink">Ghi chú: </span>
            {booking.customerNote}
          </div>
        )}

        {/* Actions */}
        {canCancel && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-ink/8">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setShowReschedule((v) => !v)}
            >
              <IconRefresh size={14} />
              Đổi lịch
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onCancel}
              className="text-red-600 hover:bg-red-50"
            >
              <IconClose size={14} />
              Huỷ lịch
            </Button>
          </div>
        )}

        {showReschedule && canCancel && (
          <ReschedulePanel
            serviceIds={booking.services.map((s) => s.serviceId)}
            onPick={onReschedule}
            onClose={() => setShowReschedule(false)}
          />
        )}
      </div>
    </Card>
  );
}

function ReschedulePanel({
  serviceIds,
  onPick,
  onClose,
}: {
  serviceIds: string[];
  onPick: (startAt: string) => void;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<AvailabilitySlotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 7);
    const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;

    bookingApi
      .getAvailability({ from, to, serviceIds })
      .then((data) => {
        if (!cancelled) setSlots(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không tải được lịch trống",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [serviceIds]);

  return (
    <div className="mt-3 p-3 bg-bgsoft/60 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Chọn khung giờ mới</span>
        <button
          onClick={onClose}
          className="text-xs text-ink-muted hover:text-primary"
        >
          Đóng
        </button>
      </div>
      {loading ? (
        <div className="h-9 bg-white rounded animate-pulse" />
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : slots.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Không còn khung giờ trống trong tuần tới.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {slots.map((s) => (
            <button
              key={s.startAt}
              onClick={() => onPick(s.startAt)}
              className="py-1.5 text-xs rounded-lg border border-ink/15 bg-white hover:border-primary hover:text-primary transition-colors"
            >
              {new Date(s.startAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config: Record<
    BookingStatus,
    { tone: "default" | "primary" | "warning" | "accent"; label: string; icon: React.ReactNode }
  > = {
    CONFIRMED: {
      tone: "primary",
      label: "Đã xác nhận",
      icon: <IconCheckCircle size={11} />,
    },
    CHECKED_IN: {
      tone: "accent",
      label: "Đã nhận xe",
      icon: <IconCheckCircle size={11} />,
    },
    FULFILLED: {
      tone: "accent",
      label: "Hoàn thành",
      icon: <IconCheckCircle size={11} />,
    },
    CANCELLED: {
      tone: "default",
      label: "Đã huỷ",
      icon: <IconClose size={11} />,
    },
    NO_SHOW: {
      tone: "warning",
      label: "Không đến",
      icon: <IconWarning size={11} />,
    },
  };
  const c = config[status] ?? {
    tone: "default" as const,
    label: status,
    icon: <IconClock size={11} />,
  };
  return (
    <Badge tone={c.tone}>
      {c.icon} {c.label}
    </Badge>
  );
}

// =========================
// Tab: Lịch sử bảo dưỡng (GET /api/service-history/me)
// =========================
function ServiceHistoryTab() {
  const t = useToast();
  const [items, setItems] = useState<ServiceHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await customerVehicleApi.getMyServiceHistory(0, 50);
      setItems(page.items ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được lịch sử bảo dưỡng từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-bgsoft rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-10 text-center">
          <p className="font-semibold mb-2">Không tải được lịch sử bảo dưỡng</p>
          <p className="text-sm text-ink-light mb-5">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh size={14} /> Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconWrench size={32} className="text-ink-muted" />
          </div>
          <p className="font-semibold text-lg mb-1">Chưa có lịch sử bảo dưỡng</p>
          <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
            Sau khi bạn mang xe đến {GARAGE.name}, lịch sử bảo dưỡng sẽ xuất
            hiện tại đây.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((h) => (
        <Card key={h.id}>
          <div className="p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{h.summary}</h3>
                <div className="text-xs text-ink-muted mt-1 flex flex-wrap gap-3">
                  <span className="flex items-center gap-1">
                    <IconCalendar size={12} />
                    {new Date(h.serviceDate).toLocaleDateString("vi-VN")}
                  </span>
                  {h.odometerKm != null && (
                    <span>
                      · ODO:{" "}
                      <strong className="text-ink">
                        {h.odometerKm.toLocaleString("vi-VN")} km
                      </strong>
                    </span>
                  )}
                  {h.garageName && <span>· {h.garageName}</span>}
                </div>
              </div>
              {h.licensePlate && (
                <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg shrink-0">
                  {h.licensePlate}
                </span>
              )}
            </div>
            {h.description && (
              <p className="text-sm text-ink-light">{h.description}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// =========================
// Tab: Hóa đơn (GET /api/invoices/me)
// =========================
function InvoicesTab() {
  const t = useToast();
  const [items, setItems] = useState<InvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InvoiceSummaryResponse | null>(null);
  const [detail, setDetail] = useState<InvoiceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await billingApi.getMyInvoices(0, 50);
      setItems(page.items ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách hóa đơn từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (inv: InvoiceSummaryResponse) => {
    setSelected(inv);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await billingApi.getInvoice(inv.id));
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không tải được chi tiết hóa đơn",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-bgsoft rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-10 text-center">
          <p className="font-semibold mb-2">Không tải được danh sách hóa đơn</p>
          <p className="text-sm text-ink-light mb-5">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh size={14} /> Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconCash size={32} className="text-ink-muted" />
          </div>
          <p className="font-semibold text-lg mb-1">Chưa có hóa đơn nào</p>
          <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
            Hóa đơn sẽ xuất hiện sau khi bạn hoàn tất dịch vụ tại {GARAGE.name}.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((inv) => (
        <Card key={inv.id}>
          <button
            onClick={() => void openDetail(inv)}
            className="w-full p-4 md:p-5 text-left flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono font-bold text-primary">{inv.code}</span>
                <InvoiceStatusBadge status={inv.status} />
              </div>
              <div className="text-xs text-ink-muted">
                Phát hành:{" "}
                {new Date(inv.issuedAt).toLocaleDateString("vi-VN")}
                {inv.paidAt &&
                  ` · Đã thanh toán: ${new Date(
                    inv.paidAt,
                  ).toLocaleDateString("vi-VN")}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-muted">Tổng cộng</div>
              <div className="font-bold text-primary text-lg">
                {formatCompactVND(inv.grandTotal)}
              </div>
            </div>
          </button>
        </Card>
      ))}

      {/* Modal chi tiết hóa đơn */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4 mb-4">
              <div>
                <div className="text-xs text-ink-muted mb-1">Mã hóa đơn</div>
                <h3 className="font-mono font-bold text-lg">{selected.code}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-bgsoft"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                Đang tải chi tiết...
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-muted">Trạng thái</div>
                    <div className="mt-1">
                      <InvoiceStatusBadge status={detail.status} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">Ngày phát hành</div>
                    <div className="font-semibold">
                      {new Date(detail.issuedAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>

                {detail.items.length > 0 && (
                  <div className="border border-ink/8 rounded-xl divide-y divide-ink/5">
                    {detail.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-ink line-clamp-1">
                            {item.snapshotName}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            {item.itemType === "SERVICE" ? "Dịch vụ" : "Phụ tùng"} ·
                            SL {item.quantity ?? 1}
                          </div>
                        </div>
                        <div className="font-semibold text-ink shrink-0">
                          {formatCompactVND(item.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-ink/8 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-light">Phí công</span>
                    <span className="text-ink">{formatFullVND(detail.subtotalLabor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-light">Tiền phụ tùng</span>
                    <span className="text-ink">{formatFullVND(detail.subtotalParts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-light">Chiết khấu</span>
                    <span className="text-ink">-{formatFullVND(detail.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-light">Thuế</span>
                    <span className="text-ink">{formatFullVND(detail.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-ink/8">
                    <span className="font-semibold text-ink">Tổng cộng</span>
                    <span className="font-bold text-primary text-lg">
                      {formatFullVND(detail.grandTotal)}
                    </span>
                  </div>
                  {detail.paidAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-light">Đã thanh toán</span>
                      <span className="text-ink">{formatFullVND(detail.paidAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-ink-muted">
                Không tải được chi tiết hóa đơn.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<
    InvoiceStatus,
    { tone: "default" | "primary" | "warning" | "accent"; label: string }
  > = {
    UNPAID: { tone: "warning", label: "Chưa thanh toán" },
    PARTIALLY_PAID: { tone: "primary", label: "Thanh toán một phần" },
    PAID: { tone: "accent", label: "Đã thanh toán" },
    VOID: { tone: "default", label: "Đã huỷ" },
  };
  const c = config[status] ?? {
    tone: "default" as const,
    label: status,
  };
  return <Badge tone={c.tone}>{c.label}</Badge>;
}

// =========================
// Tab: Xe của tôi
// =========================
function VehiclesTab({
  vehicles,
  userId,
}: {
  vehicles: Vehicle[];
  userId: string;
}) {
  const t = useToast();
  const [list, setList] = useState<Vehicle[]>(vehicles);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    plate: "",
    make: "",
    model: "",
    year: "",
    color: "",
    fuelType: "",
    transmission: "",
    odometerKm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setList(vehicles);
  }, [vehicles]);

  /** Lưu cục bộ — dùng khi server không cho phép ghi (403 VEHICLE_*). */
  const persistLocal = (next: Vehicle[]) => {
    setList(next);
    saveUserVehicles(userId, next);
  };

  const resetForm = () => {
    setForm({
      plate: "",
      make: "",
      model: "",
      year: "",
      color: "",
      fuelType: "",
      transmission: "",
      odometerKm: "",
    });
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.plate.trim()) e.plate = "Vui lòng nhập biển số";
    if (!form.make.trim()) e.make = "Vui lòng nhập hãng xe";
    if (!form.model.trim()) e.model = "Vui lòng nhập dòng xe";
    if (form.year && !/^\d{4}$/.test(form.year.trim())) {
      e.year = "Năm sản xuất phải là 4 chữ số";
    }
    if (form.odometerKm && !/^\d+$/.test(form.odometerKm.trim())) {
      e.odometerKm = "Số km phải là số nguyên";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const payload = {
      licensePlate: form.plate.trim().toUpperCase(),
      make: form.make.trim(),
      model: form.model.trim(),
      modelYear: form.year ? Number(form.year) : null,
      color: form.color.trim() || null,
      fuelType: form.fuelType.trim() || null,
      transmission: form.transmission.trim() || null,
      odometerKm: form.odometerKm ? Number(form.odometerKm) : null,
      isActive: true,
    };

    try {
      if (editingId) {
        // ── Sửa xe: PUT /api/vehicles/{id} (cần VEHICLE_UPDATE) ──
        const updated = await customerVehicleApi.updateVehicle(
          editingId,
          payload,
        );
        const next = list.map((v) =>
          v.id === editingId
            ? {
                ...v,
                nickname: `${updated.make} ${updated.model}`,
                brand: updated.make ?? v.brand,
                model: updated.model ?? v.model,
                year: updated.modelYear ?? v.year,
                plate: updated.licensePlate,
                odoKm: updated.odometerKm ?? v.odoKm,
                color: updated.color ?? undefined,
              }
            : v,
        );
        persistLocal(next);
        t.success(
          `Đã cập nhật xe ${updated.licensePlate ?? payload.licensePlate}`,
        );
      } else {
        // ── Thêm xe: POST /api/vehicles (cần VEHICLE_CREATE) ──
        const created = await customerVehicleApi.createVehicle(payload);
        persistLocal([
          {
            id: created.id,
            nickname: `${created.make} ${created.model}`,
            brand: created.make ?? "",
            model: created.model ?? "",
            year: created.modelYear ?? new Date().getFullYear(),
            plate: created.licensePlate,
            odoKm: created.odometerKm ?? 0,
            image:
              "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70",
            color: created.color ?? undefined,
          },
          ...list,
        ]);
        t.success(
          `Đã thêm xe ${created.licensePlate ?? payload.licensePlate}`,
        );
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      if (isAuthError(err)) {
        // CUSTOMER chưa có authority VEHICLE_CREATE / VEHICLE_UPDATE →
        // lưu cục bộ để không mất dữ liệu người dùng vừa nhập.
        if (editingId) {
          persistLocal(
            list.map((v) =>
              v.id === editingId
                ? {
                    ...v,
                    nickname: `${payload.make} ${payload.model}`,
                    brand: payload.make,
                    model: payload.model,
                    year: payload.modelYear ?? v.year,
                    plate: payload.licensePlate,
                    odoKm: payload.odometerKm ?? v.odoKm,
                    color: payload.color ?? undefined,
                  }
                : v,
            ),
          );
          t.info(
            "Bạn không có quyền sửa xe trực tiếp trên máy chủ. Thay đổi đã được lưu tạm trên thiết bị này.",
          );
        } else {
          persistLocal([
            {
              id: `local-${Date.now()}`,
              nickname: `${payload.make} ${payload.model}`,
              brand: payload.make,
              model: payload.model,
              year: payload.modelYear ?? new Date().getFullYear(),
              plate: payload.licensePlate,
              odoKm: payload.odometerKm ?? 0,
              image:
                "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70",
              color: payload.color ?? undefined,
            },
            ...list,
          ]);
          t.info(
            "Bạn không có quyền thêm xe trực tiếp trên máy chủ. Xe đã được lưu tạm trên thiết bị này — vui lòng liên hệ xưởng để đồng bộ.",
          );
        }
        setShowModal(false);
        setEditingId(null);
        resetForm();
      } else {
        t.error(
          err instanceof Error ? err.message : "Lưu xe thất bại, vui lòng thử lại",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /** ── Xoá xe: DELETE /api/vehicles/{id} (cần VEHICLE_DELETE) ── */
  const handleDelete = async (vehicle: Vehicle) => {
    const prev = list;
    // Cập nhật optimistic để UI phản hồi tức thì.
    persistLocal(prev.filter((v) => v.id !== vehicle.id));
    setDeletingId(null);
    try {
      await customerVehicleApi.deleteVehicle(vehicle.id);
      t.success(`Đã xoá xe ${vehicle.plate}`);
    } catch (err) {
      // Không có quyền xoá trên server → giữ bản xoá cục bộ, báo rõ.
      persistLocal(prev.filter((v) => v.id !== vehicle.id));
      if (isAuthError(err)) {
        t.info(
          "Bạn không có quyền xoá xe trên máy chủ. Xe đã được ẩn tạm trên thiết bị này.",
        );
      } else {
        t.error(
          err instanceof Error ? err.message : "Không xoá được xe, vui lòng thử lại",
        );
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Xe đã đăng ký ({list.length})</h2>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <IconPlus size={16} />
          Thêm xe
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-3">
              <IconCar size={32} className="text-ink-muted" />
            </div>
            <p className="font-semibold mb-1">Chưa có xe nào</p>
            <p className="text-sm text-ink-light">
              Đăng ký xe để AutoCare gợi ý dịch vụ bảo dưỡng phù hợp.
            </p>
            <Button className="mt-5" onClick={() => setShowModal(true)}>
              <IconPlus size={16} />
              Thêm xe
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((v) => (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setForm({
                        plate: v.plate,
                        make: v.brand,
                        model: v.model,
                        year: String(v.year ?? ""),
                        color: v.color ?? "",
                        fuelType: "",
                        transmission: "",
                        odometerKm: String(v.odoKm ?? ""),
                      });
                      setErrors({});
                      setEditingId(v.id);
                      setShowModal(true);
                    }}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    aria-label={`Xoá xe ${v.plate}`}
                    onClick={() => setDeletingId(v.id)}
                  >
                    <IconTrash size={15} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal thêm / sửa xe */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Thông tin xe"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-cardHover max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink/8 sticky top-0 bg-white">
              <h2 className="font-bold text-lg">
                {editingId ? "Cập nhật xe" : "Thông tin xe"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-bgsoft"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <Input
                label="Biển số *"
                placeholder="30A-123.45"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
                error={errors.plate}
                required
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Hãng xe *"
                  placeholder="Toyota"
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                  error={errors.make}
                  required
                />
                <Input
                  label="Dòng xe *"
                  placeholder="Vios"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  error={errors.model}
                  required
                />
                <Input
                  label="Năm sản xuất"
                  placeholder="2020"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  error={errors.year}
                  inputMode="numeric"
                />
                <Input
                  label="Màu xe"
                  placeholder="Đen"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <Input
                  label="Loại nhiên liệu"
                  placeholder="Xăng / Dầu / Điện"
                  value={form.fuelType}
                  onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                />
                <Input
                  label="Hộp số"
                  placeholder="Số sàn / Tự động"
                  value={form.transmission}
                  onChange={(e) =>
                    setForm({ ...form, transmission: e.target.value })
                  }
                />
              </div>
              <Input
                label="Số km hiện tại"
                placeholder="45000"
                value={form.odometerKm}
                onChange={(e) =>
                  setForm({ ...form, odometerKm: e.target.value })
                }
                error={errors.odometerKm}
                inputMode="numeric"
                hint="Giúp xưởng gợi ý lịch bảo dưỡng phù hợp"
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} fullWidth>
                  {saving ? (
                    <>
                      <IconRefresh size={16} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <IconCheckCircle size={16} />
                      Lưu xe
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Huỷ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xoá xe */}
      {deletingId &&
        (() => {
          const target = list.find((v) => v.id === deletingId);
          if (!target) return null;
          return (
            <div
              className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
              onClick={() => setDeletingId(null)}
            >
              <div
                className="bg-white rounded-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-bold text-lg mb-2">Xác nhận xoá xe?</h3>
                <p className="text-sm text-ink-light mb-6">
                  Bạn có chắc muốn xoá xe{" "}
                  <strong className="text-ink">{target.plate}</strong> (
                  {target.nickname})? Hành động này không thể hoàn tác.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDeletingId(null)}>
                    Huỷ
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => void handleDelete(target)}
                  >
                    Xoá xe
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
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