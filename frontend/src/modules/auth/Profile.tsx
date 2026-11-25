import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  IconUser,
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
  IconArrowLeft,
  IconCalendar,
  IconSale,
  IconWarning,
  IconWrench,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../data/authStore";
import type {
  AvailabilitySlotResponse,
  BookingResponse,
  BookingStatus,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceSummaryResponse,
  ServiceHistoryResponse,
  ServiceRecordType,
} from "../../api/types";
import { bookingApi } from "../../api/endpoints/booking";
import { billingApi } from "../../api/endpoints/billing";
import { customerVehicleApi } from "../../api/endpoints/customerVehicle";
import { GARAGE } from "../../config/garage";
import UnifiedProfileForm from "./UnifiedProfileForm";
import {
  buildMyVehicles,
  vehicleLabel,
  type MyVehicle,
} from "./myVehicles";
import {
  formatCompactVND,
  formatDateVN,
  formatFullVND,
} from "../../utils/format";

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

/**
 * Nhãn + màu cho loại bản ghi lịch sử bảo dưỡng.
 *
 * Khớp `ServiceRecordType.java` ở backend. `GARAGE_SERVICE` là bản ghi do
 * chính hệ thống ghi (hạng mục bảo dưỡng trong gara), còn hai loại còn lại là
 * bản ghi bên ngoài — phân biệt để khách hiểu nguồn gốc của thông tin.
 */
const RECORD_TYPE_META: Record<
  ServiceRecordType,
  { label: string; tone: "primary" | "accent" | "warning" }
> = {
  GARAGE_SERVICE: { label: "Hệ thống AutoCare", tone: "accent" },
  EXTERNAL_SERVICE: { label: "Garage ngoài", tone: "primary" },
  CUSTOMER_REPORTED: { label: "Khách tự báo", tone: "warning" },
};

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
  //
  // Danh sách xe KHÔNG pre-fetch ở đây: `VehiclesTab` tự tải
  // `GET /api/service-history/me` và gom thành danh sách xe. Xem
  // `myVehicles.ts` để hiểu vì sao không có endpoint "xe của tôi".

  // Số liệu tổng quan: lịch hẹn + tổng chi tiêu.
  const [bookingsCount, setBookingsCount] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  // Số xe đã từng mang đến xưởng — dùng cho ô thống kê nhanh.
  const [vehiclesCount, setVehiclesCount] = useState(0);

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
      try {
        const page = await customerVehicleApi.getMyServiceHistory(0, 100);
        if (cancelled) return;
        setVehiclesCount(buildMyVehicles(page.items ?? []).length);
      } catch {
        // Không tải được lịch sử → để 0, tab "Xe của tôi" tự hiển thị lỗi.
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
            label="Xe đã mang đến"
            value={vehiclesCount.toString()}
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
        {activeTab === "vehicles" && <VehiclesTab />}
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

  const [reloading, setReloading] = useState(false);
  const handleReloadCustomer = async () => {
    setReloading(true);
    try {
      await refreshCustomer();
    } finally {
      setReloading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Cột trái: hồ sơ thống nhất + banner liên kết */}
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

        {/* Một form duy nhất cho cả thông tin tài khoản lẫn hồ sơ khách hàng.
            Trước đây có hai form chồng lặp (tên/email/SĐT) và cả hai đều
            không ghi được lên server với tài khoản CUSTOMER. */}
        <UnifiedProfileForm
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          userPhone={user.phone}
          customer={customer ?? null}
          customerStatus={customerStatus ?? "unknown"}
          onCustomerUpdated={handleReloadCustomer}
          onUserUpdated={(patch) => updateProfile(patch)}
        />

        {/* Link về trang chủ — để cuối cột trái cho khỏi chen vào form. */}
        <div className="text-center">
          <Link
            to="/"
            className="text-xs text-ink-muted hover:text-primary inline-flex items-center gap-1"
          >
            <IconArrowLeft size={12} /> Về trang chủ
          </Link>
        </div>
      </div>

      {/* Cột phải: security, tier, trạng thái hồ sơ */}
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
    // Lịch hẹn cũ có thể không còn dịch vụ nào (dịch vụ đã bị xoá ở
    // inventory-service). `serviceIds` rỗng → `serviceIds=` rỗng trong query
    // → Spring trả 400 "Tham số 'serviceIds' phải là List". Bỏ qua và báo
    // riêng cho người dùng.
    if (!serviceIds || serviceIds.length === 0) {
      setSlots([]);
      setError("Lịch hẹn này không còn dịch vụ nào để đổi lịch.");
      setLoading(false);
      return;
    }
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
      {items.map((h) => {
        const meta = RECORD_TYPE_META[h.recordType] ?? {
          label: h.recordType,
          tone: "default" as const,
        };
        return (
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
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {h.licensePlate && (
                    <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">
                      {h.licensePlate}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin xe — backend trả kèm (licensePlate/make/model). */}
              {(h.vehicleMake || h.vehicleModel) && (
                <p className="text-xs text-ink-light mb-2">
                  <IconCar size={12} className="inline mr-1 align-[-2px]" />
                  {[h.vehicleMake, h.vehicleModel].filter(Boolean).join(" ")}
                </p>
              )}

              {h.description && (
                <p className="text-sm text-ink-light">{h.description}</p>
              )}
            </div>
          </Card>
        );
      })}
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

// Tab: Xe của tôi (xe đã từng mang đến xưởng)
//
// Nguồn dữ liệu: GET /api/service-history/me — lịch sử bảo dưỡng của CHÍNH
// người đang đăng nhập, rồi gom theo xe (xem `myVehicles.ts`).
//
// Vì sao không có nút "Thêm xe"?
// --------------------------------
// Backend đã bỏ khái niệm sở hữu xe: `vehicles.customer_id` bị DROP ở
// migration V3, và role CUSTOMER không có `VEHICLE_CREATE` / `VEHICLE_UPDATE`
// (V5 cấp các quyền này cho ADMIN/MANAGER/MECHANIC). Gọi API thêm/sửa xe từ
// phía khách luôn trả 1403 — nên UI không nên giữ một nút thao tác chắc chắn
// thất bại. Xe của khách được xưởng ghi nhận khi khách mang đến tiếp nhận.
function VehiclesTab() {
  const [vehicles, setVehicles] = useState<MyVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await customerVehicleApi.getMyServiceHistory(0, 100);
      setVehicles(buildMyVehicles(page.items ?? []));
    } catch (err) {
      setVehicles([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách xe từ máy chủ",
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
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-bgsoft rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-10 text-center">
          <p className="font-semibold mb-2">Không tải được danh sách xe</p>
          <p className="text-sm text-ink-light mb-5">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh size={14} /> Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconCar size={32} className="text-ink-muted" />
          </div>
          <p className="font-semibold text-lg mb-1">Chưa có xe nào</p>
          <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
            Khi bạn mang xe đến {GARAGE.name}, xe đó sẽ được xưởng ghi nhận và
            xuất hiện tại đây kèm lịch sử bảo dưỡng.
          </p>
          <Link to="/services">
            <Button>
              <IconCalendar size={16} />
              Đặt lịch bảo dưỡng
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">
            Xe đã từng mang đến ({vehicles.length})
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Danh sách dựa trên các lần tiếp nhận xe của bạn tại {GARAGE.name}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <IconRefresh size={14} />
          Làm mới
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {vehicles.map((v) => (
          <Card key={v.id ?? v.plate} className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink truncate">
                    {vehicleLabel(v)}
                  </h3>
                  {v.brand || v.model ? (
                    <div className="text-sm text-ink-light truncate">
                      {[v.brand, v.model].filter(Boolean).join(" ")}
                    </div>
                  ) : null}
                </div>
                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg text-xs shrink-0">
                  {v.plate}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info
                  label="Số lần bảo dưỡng"
                  value={`${v.serviceCount} lần`}
                />
                <Info
                  label="Odo gần nhất"
                  value={
                    v.lastOdometerKm != null
                      ? `${v.lastOdometerKm.toLocaleString("vi-VN")} km`
                      : "Chưa ghi nhận"
                  }
                />
                {v.lastServiceDate && (
                  <Info
                    label="Bảo dưỡng gần nhất"
                    value={formatDateVN(v.lastServiceDate)}
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
                <Link to="/profile?tab=history" className="flex-1">
                  <Button variant="ghost" size="sm" fullWidth>
                    <IconWrench size={15} />
                    Lịch sử
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
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