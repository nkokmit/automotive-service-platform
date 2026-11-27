import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconCalendar,
  IconCar,
  IconClock,
  IconSearch,
  IconRefresh,
  IconCheckCircle,
  IconClose,
  IconWarning,
  IconUsers,
  IconWrench,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { useToast } from "../../components/Toast";
import { staffBookingApi } from "../../api/endpoints/booking";
import { customerVehicleApi } from "../../api/endpoints/customerVehicle";
import { workOrderApi } from "../../api/endpoints/workOrder";
import type {
  BookingStatus,
  StaffBookingResponse,
  VehicleResponse,
  WorkOrderListItemResponse,
} from "../../api/types";

// =========================
// AdminBookings — Lịch hẹn xưởng
// Nguồn dữ liệu: GET /api/staff/bookings (cần authority BOOKING_READ)
// =========================

const STATUS_FILTERS: { id: "all" | BookingStatus; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "CONFIRMED", label: "Đã xác nhận" },
  { id: "CHECKED_IN", label: "Đã nhận xe" },
  { id: "FULFILLED", label: "Hoàn thành" },
  { id: "CANCELLED", label: "Đã huỷ" },
  { id: "NO_SHOW", label: "Không đến" },
];

const STATUS_TONE: Record<
  BookingStatus,
  "default" | "primary" | "warning" | "accent"
> = {
  CONFIRMED: "primary",
  CHECKED_IN: "accent",
  FULFILLED: "accent",
  CANCELLED: "default",
  NO_SHOW: "warning",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã nhận xe",
  FULFILLED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
  NO_SHOW: "Không đến",
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminBookings() {
  const t = useToast();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | BookingStatus>("all");
  const [bookings, setBookings] = useState<StaffBookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderListItemResponse[]>([]);
  /** Lịch hẹn đang mở modal tiếp nhận xe. */
  const [checkInFor, setCheckInFor] = useState<StaffBookingResponse | null>(null);

  // Nhận `?q=` từ ô tìm kiếm trên topbar admin
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await staffBookingApi.listBookings({
        status: activeStatus === "all" ? undefined : activeStatus,
        size: 50,
      });
      setBookings(page.items ?? []);
    } catch (err) {
      setBookings([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được lịch hẹn từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Work Order liên quan — GET /api/work-orders (cần WORK_ORDER_READ).
  useEffect(() => {
    let cancelled = false;
    workOrderApi
      .listWorkOrders({ size: 50 })
      .then((page) => {
        if (!cancelled) setWorkOrders(page.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setWorkOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const s = search.trim().toLowerCase();
    return bookings.filter(
      (b) =>
        b.licensePlateSnapshot?.toLowerCase().includes(s) ||
        b.customerNote?.toLowerCase().includes(s) ||
        b.services.some((sv) =>
          sv.serviceNameSnapshot?.toLowerCase().includes(s),
        ),
    );
  }, [bookings, search]);

  const handleStatus = async (
    booking: StaffBookingResponse,
    status: BookingStatus,
  ) => {
    setBusyId(booking.id);
    try {
      const updated = await staffBookingApi.updateStatus(booking.id, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, ...updated } : b)),
      );
      t.success(`Đã cập nhật lịch hẹn → ${STATUS_LABEL[status]}`);
    } catch (err) {
      t.error(
        err instanceof Error
          ? err.message
          : "Không cập nhật được trạng thái lịch hẹn",
      );
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Tiếp nhận xe — dùng endpoint RIÊNG `POST /api/staff/bookings/{id}/check-in`.
   *
   * KHÔNG dùng `updateStatus("CHECKED_IN")`: backend trả lỗi 5003
   * ("Trạng thái CHECKED_IN không được đặt trực tiếp"). Endpoint check-in bắt
   * buộc có `vehicleId` + `odometerIn` và chỉ chạy được trong ngày hẹn.
   */
  const handleCheckIn = async (
    booking: StaffBookingResponse,
    vehicleId: string,
    odometerIn: number,
    vehicleCondition: string,
  ) => {
    setBusyId(booking.id);
    try {
      const updated = await staffBookingApi.checkIn(booking.id, {
        vehicleId,
        odometerIn,
        vehicleCondition: vehicleCondition.trim() || null,
        customerNote: booking.customerNote ?? null,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, ...updated } : b)),
      );
      t.success("Đã tiếp nhận xe thành công");
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không tiếp nhận được xe",
      );
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", bookings.length);
    for (const b of bookings) map.set(b.status, (map.get(b.status) ?? 0) + 1);
    return map;
  }, [bookings]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconCalendar size={20} />
            </span>
            Lịch hẹn xưởng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {bookings.length} lịch hẹn · {workOrders.length} work order
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<IconCalendar size={16} className="text-white" />}
          label="Tổng lịch hẹn"
          value={bookings.length}
          color="bg-primary"
        />
        <StatCard
          icon={<IconCheckCircle size={16} className="text-white" />}
          label="Đã nhận xe"
          value={counts.get("CHECKED_IN") ?? 0}
          color="bg-emerald-500"
        />
        <StatCard
          icon={<IconWrench size={16} className="text-white" />}
          label="Đang xử lý"
          value={counts.get("CONFIRMED") ?? 0}
          color="bg-amber-500"
        />
        <StatCard
          icon={<IconClose size={16} className="text-white" />}
          label="Đã huỷ / không đến"
          value={(counts.get("CANCELLED") ?? 0) + (counts.get("NO_SHOW") ?? 0)}
          color="bg-red-500"
        />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm biển số, dịch vụ, ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStatus(s.id)}
              className={[
                "text-sm font-medium px-3 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5",
                activeStatus === s.id
                  ? "bg-primary text-white"
                  : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
              ].join(" ")}
            >
              {s.label}
              <span
                className={[
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  activeStatus === s.id
                    ? "bg-white/20 text-white"
                    : "bg-bgsoft text-ink-muted",
                ].join(" ")}
              >
                {counts.get(s.id) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải lịch hẹn...
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-semibold mb-2">Không tải được lịch hẹn</p>
            <p className="text-sm text-ink-light mb-5">{error}</p>
            <Button variant="outline" onClick={() => void load()}>
              <IconRefresh size={14} /> Thử lại
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có lịch hẹn nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Biển số</th>
                  <th className="font-medium px-4 py-3">Dịch vụ</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">
                    Thời gian
                  </th>
                  <th className="font-medium px-4 py-3 hidden lg:table-cell">
                    Nguồn
                  </th>
                  <th className="font-medium px-4 py-3 text-center">
                    Trạng thái
                  </th>
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const wo = b.workOrderId
                    ? workOrders.find((w) => w.id === b.workOrderId)
                    : undefined;
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-ink/5 hover:bg-bgsoft/40"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg text-xs">
                          {b.licensePlateSnapshot}
                        </span>
                        {b.customerNote && (
                          <div className="text-[11px] text-ink-muted mt-1 max-w-[220px] truncate">
                            {b.customerNote}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {b.services.length === 0 ? (
                          <span className="text-ink-muted text-xs">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {b.services.map((s) => (
                              <li key={s.serviceId} className="text-xs text-ink">
                                {s.serviceNameSnapshot}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-light">
                        <div className="flex items-center gap-1">
                          <IconClock size={11} />
                          {fmtTime(b.startAt)}
                        </div>
                        {b.checkedInAt && (
                          <div className="text-[11px] text-emerald-600 mt-0.5">
                            Nhận xe: {fmtTime(b.checkedInAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge tone="default">
                          {b.source === "ONLINE"
                            ? "Online"
                            : b.source === "PHONE"
                              ? "Điện thoại"
                              : "Tại xưởng"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={STATUS_TONE[b.status] ?? "default"}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </Badge>
                        {wo && (
                          <div className="text-[10px] text-ink-muted mt-1 font-mono">
                            {wo.code}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {b.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              disabled={busyId === b.id}
                              onClick={() => setCheckInFor(b)}
                            >
                              <IconCheckCircle size={12} />
                              Nhận xe
                            </Button>
                          )}
                          {b.status === "CHECKED_IN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === b.id}
                              onClick={() => void handleStatus(b, "FULFILLED")}
                            >
                              Hoàn thành
                            </Button>
                          )}
                          {(b.status === "CONFIRMED" ||
                            b.status === "CHECKED_IN") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              disabled={busyId === b.id}
                              onClick={() => void handleStatus(b, "CANCELLED")}
                            >
                              <IconClose size={12} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> /{" "}
          {bookings.length} lịch hẹn
        </div>
      </div>

      {/* Work Order gần đây */}
      {workOrders.length > 0 && (
        <Card hover={false}>
          <div className="p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <IconWrench size={16} className="text-primary" />
              Work Order gần đây
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                    <th className="font-medium py-2">Mã</th>
                    <th className="font-medium py-2">Trạng thái</th>
                    <th className="font-medium py-2 hidden md:table-cell">
                      ODO vào
                    </th>
                    <th className="font-medium py-2 hidden md:table-cell">
                      Tạo lúc
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.slice(0, 10).map((w) => (
                    <tr key={w.id} className="border-b border-ink/5 last:border-0">
                      <td className="py-2 font-mono text-xs font-semibold">
                        {w.code}
                      </td>
                      <td className="py-2">
                        <Badge tone="default">{w.status}</Badge>
                      </td>
                      <td className="py-2 hidden md:table-cell text-xs text-ink-muted">
                        {w.odometerIn != null
                          ? `${w.odometerIn.toLocaleString("vi-VN")} km`
                          : "—"}
                      </td>
                      <td className="py-2 hidden md:table-cell text-xs text-ink-muted">
                        {fmtTime(w.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {checkInFor && (
        <BookingCheckInModal
          booking={checkInFor}
          onClose={() => setCheckInFor(null)}
          onSubmit={handleCheckIn}
        />
      )}

      {error && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconWarning size={12} />
          Nếu bạn thấy lỗi quyền truy cập, hãy đăng nhập bằng tài khoản ADMIN /
          MANAGER (cần authority BOOKING_READ).
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-ink/8 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}
        >
          {icon}
        </div>
        <div className="text-xs text-ink-muted">{label}</div>
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

// =========================
// Modal tiếp nhận xe
// =========================

/**
 * `POST /api/staff/bookings/{id}/check-in` yêu cầu:
 *  - `vehicleId` (bắt buộc) — xe thực tế đưa vào xưởng. Booking chưa gắn xe
 *    thì không tạo được Work Order (lỗi 6203).
 *  - `odometerIn` (bắt buộc, >= 0).
 *
 * Backend cũng chỉ cho tiếp nhận trong **ngày hẹn** (lỗi 5305) và bắt buộc biển
 * số của xe phải khớp `licensePlateSnapshot` của booking (lỗi 5303).
 */
function BookingCheckInModal({
  booking,
  onClose,
  onSubmit,
}: {
  booking: StaffBookingResponse;
  onClose: () => void;
  onSubmit: (
    booking: StaffBookingResponse,
    vehicleId: string,
    odometerIn: number,
    vehicleCondition: string,
  ) => Promise<void>;
}) {
  const t = useToast();
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [condition, setCondition] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    customerVehicleApi
      .listVehicles({ licensePlate: booking.licensePlateSnapshot, size: 20 })
      .then((page) => setVehicles(page.items ?? []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, [booking.licensePlateSnapshot]);

  const submit = async () => {
    if (!vehicleId) {
      t.error("Chọn xe thực tế đưa vào xưởng");
      return;
    }
    const odo = Number(odometer);
    if (!Number.isFinite(odo) || odo < 0) {
      t.error("Số km vào xưởng phải là số không âm");
      return;
    }
    setBusy(true);
    await onSubmit(booking, vehicleId, Math.floor(odo), condition);
    setBusy(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-lg">Tiếp nhận xe</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Biển số{" "}
              <span className="font-mono font-semibold text-ink">
                {booking.licensePlateSnapshot}
              </span>{" "}
              · {booking.startAt ? fmtTime(booking.startAt) : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bgsoft"
            aria-label="Đóng"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Xe đưa vào xưởng <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <p className="text-sm text-ink-muted">Đang tải danh sách xe...</p>
            ) : vehicles.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Không tìm thấy xe nào khớp biển số{" "}
                {booking.licensePlateSnapshot}. Hãy kiểm tra hồ sơ xe trong
                trang <strong>Khách hàng &amp; Xe</strong> trước.
              </div>
            ) : (
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary"
              >
                <option value="">-- chọn xe --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate}
                    {v.make ? ` · ${v.make}` : ""}
                    {v.model ? ` ${v.model}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Số km vào xưởng <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="VD: 45000"
              className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Tình trạng xe
            </label>
            <input
              type="text"
              placeholder="VD: xướt chốt sân, vô-lăng bển…"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary"
            />
          </div>

          <p className="text-[11px] text-ink-muted">
            Lưu ý: backend chỉ cho tiếp nhận xe trong ngày hẹn, và biển số xe
            phải khớp biển số trên lịch hẹn.
          </p>
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-ink/8">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || vehicles.length === 0}
          >
            <IconCheckCircle size={14} />
            {busy ? "Đang tiếp nhận..." : "Tiếp nhận xe"}
          </Button>
        </div>
      </div>
    </div>
  );
}
