import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconWrench,
  IconSearch,
  IconRefresh,
  IconWarning,
  IconCar,
  IconUsers,
  IconClock,
  IconClose,
  IconPlus,
  IconCheckCircle,
  IconArrowRight,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { workOrderApi } from "../../api/endpoints/workOrder";
import { staffBookingApi } from "../../api/endpoints/booking";
import { hasTokenAuthority } from "../../api/session";
import AdminWorkOrderDetail from "./AdminWorkOrderDetail";
import type {
  StaffBookingResponse,
  WorkOrderListItemResponse,
  WorkOrderStatus,
} from "../../api/types";

// =========================
// AdminWorkOrders — Phiếu sửa chữa
// Nguồn dữ liệu: GET /api/work-orders (cần authority WORK_ORDER_READ)
// =========================

const STATUS_FILTERS: { id: "all" | WorkOrderStatus; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "CREATED", label: "Mới tạo" },
  { id: "DIAGNOSING", label: "Đang chẩn đoán" },
  { id: "PENDING_APPROVAL", label: "Chờ duyệt" },
  { id: "IN_PROGRESS", label: "Đang sửa" },
  { id: "COMPLETED", label: "Hoàn thành" },
  { id: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { id: "CLOSED", label: "Đã đóng" },
  { id: "CANCELED", label: "Đã huỷ" },
];

const STATUS_TONE: Record<
  WorkOrderStatus,
  "default" | "primary" | "warning" | "accent"
> = {
  CREATED: "default",
  DIAGNOSING: "primary",
  PENDING_APPROVAL: "warning",
  IN_PROGRESS: "primary",
  COMPLETED: "accent",
  PENDING_PAYMENT: "warning",
  CLOSED: "default",
  CANCELED: "default",
};

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  CREATED: "Mới tạo",
  DIAGNOSING: "Đang chẩn đoán",
  PENDING_APPROVAL: "Chờ duyệt",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành",
  PENDING_PAYMENT: "Chờ thanh toán",
  CLOSED: "Đã đóng",
  CANCELED: "Đã huỷ",
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
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

export default function AdminWorkOrders() {
  const t = useToast();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | WorkOrderStatus>(
    "all",
  );
  const [items, setItems] = useState<WorkOrderListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Id của phiếu đang mở chi tiết. */
  const [detailId, setDetailId] = useState<string | null>(null);
  /** Mở modal tạo phiếu mới. */
  const [showCreate, setShowCreate] = useState(false);

  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await workOrderApi.listWorkOrders({
        status: activeStatus === "all" ? undefined : activeStatus,
        size: 50,
      });
      setItems(page.items ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách phiếu sửa chữa từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter(
      (w) =>
        w.code?.toLowerCase().includes(s) ||
        w.bookingId?.toLowerCase().includes(s) ||
        w.customerId?.toLowerCase().includes(s),
    );
  }, [items, search]);

  const canCreate = hasTokenAuthority("WORK_ORDER_CREATE");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconWrench size={20} />
            </span>
            Phiếu sửa chữa (Work Order)
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {items.length} phiếu
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <IconPlus size={14} /> Tạo phiếu
            </Button>
          )}
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
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm mã phiếu, booking, khách hàng..."
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
                "text-sm font-medium px-3 py-2 rounded-xl transition-colors",
                activeStatus === s.id
                  ? "bg-primary text-white"
                  : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải phiếu sửa chữa...
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-semibold mb-2">
              Không tải được danh sách phiếu sửa chữa
            </p>
            <p className="text-sm text-ink-light mb-5">{error}</p>
            <Button variant="outline" onClick={() => void load()}>
              <IconRefresh size={14} /> Thử lại
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có phiếu sửa chữa nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Mã phiếu</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">
                    Xe / Khách
                  </th>
                  <th className="font-medium px-4 py-3 text-right hidden lg:table-cell">
                    ODO vào
                  </th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">
                    Tạo lúc
                  </th>
                  <th className="font-medium px-4 py-3 text-center">
                    Trạng thái
                  </th>
                  <th className="font-medium px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailId(w.id)}
                        className="font-mono font-bold text-primary hover:underline"
                      >
                        {w.code}
                      </button>
                      {w.bookingId && (
                        <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                          BK: {w.bookingId.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-light">
                      <div className="flex items-center gap-1">
                        <IconCar size={11} />
                        {w.vehicleId ? w.vehicleId.slice(0, 8) : "—"}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <IconUsers size={11} />
                        {w.customerId ? w.customerId.slice(0, 8) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs whitespace-nowrap hidden lg:table-cell">
                      {w.odometerIn != null
                        ? `${w.odometerIn.toLocaleString("vi-VN")} km`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-muted whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <IconClock size={11} />
                        {fmtTime(w.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={STATUS_TONE[w.status] ?? "default"}>
                        {STATUS_LABEL[w.status] ?? w.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailId(w.id)}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> /{" "}
          {items.length} phiếu
        </div>
      </div>

      {error && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconWarning size={12} />
          Nếu bạn thấy lỗi quyền truy cập, hãy đăng nhập bằng tài khoản ADMIN /
          MANAGER / SERVICE_ADVISOR (cần authority WORK_ORDER_READ).
        </p>
      )}

      {/* Modal tạo phiếu */}
      {showCreate && (
        <CreateWorkOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void load();
            t.success("Đã tạo phiếu sửa chữa");
          }}
        />
      )}

      {/* Modal chi tiết */}
      {detailId && (
        <AdminWorkOrderDetail
          workOrderId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

// =========================
// Tạo Work Order từ booking đã check-in
// =========================

/**
 * Backend yêu cầu booking đã CHECK-IN và đã gắn xe (lỗi 6202 / 6203), nên
 * modal này chỉ liệt kê các booking ở trạng thái CHECKED_IN.
 */
function CreateWorkOrderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useToast();
  const [bookings, setBookings] = useState<StaffBookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [odometer, setOdometer] = useState("0");
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffBookingApi
      .listBookings({ status: "CHECKED_IN", size: 50 })
      .then((page) => setBookings(page.items ?? []))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được lịch hẹn đã tiếp nhận xe",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!selected) {
      t.error("Hãy chọn một lịch hẹn đã tiếp nhận xe");
      return;
    }
    const odo = Number(odometer);
    if (!Number.isFinite(odo) || odo < 0) {
      t.error("Số km vào xưởng phải là số không âm");
      return;
    }
    setBusy(true);
    try {
      await workOrderApi.createWorkOrder({
        bookingId: selected,
        odometerIn: Math.floor(odo),
        vehicleCondition: condition.trim() || null,
        customerNote: note.trim() || null,
      });
      onCreated();
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không tạo được phiếu sửa chữa",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-lg">Tạo phiếu sửa chữa</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Chọn lịch hẹn đã tiếp nhận xe — backend tạo phiếu ở trạng thái
              CREATED, idempotent theo booking.
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
          {/* Chọn booking */}
          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Lịch hẹn đã tiếp nhận xe <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <p className="text-sm text-ink-muted">Đang tải lịch hẹn...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Chưa có lịch hẹn nào ở trạng thái "đã tiếp nhận xe". Hãy vào
                trang <strong>Lịch hẹn xưởng</strong> để tiếp nhận xe trước.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-ink/10 rounded-xl divide-y divide-ink/5">
                {bookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    className={[
                      "w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3",
                      selected === b.id ? "bg-primary/5" : "hover:bg-bgsoft",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="font-mono font-semibold text-xs">
                        {b.licensePlateSnapshot}
                      </span>
                      <span className="text-[11px] text-ink-muted ml-2">
                        {b.startAt ? fmtTime(b.startAt) : ""}
                      </span>
                      {b.customerNote && (
                        <span className="block text-[11px] text-ink-muted truncate">
                          {b.customerNote}
                        </span>
                      )}
                    </span>
                    {selected === b.id && (
                      <IconCheckCircle
                        size={16}
                        className="text-primary shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ODO */}
          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Số km vào xưởng <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Tình trạng xe */}
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

          {/* Ghi chú */}
          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Ghi chú của khách
            </label>
            <textarea
              rows={3}
              placeholder="Nội dung khách yêu cầu..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-ink/8">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !selected}>
            <IconArrowRight size={14} />
            {busy ? "Đang tạo..." : "Tạo phiếu"}
          </Button>
        </div>
      </div>
    </div>
  );
}
