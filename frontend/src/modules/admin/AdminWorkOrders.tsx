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
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { workOrderApi } from "../../api/endpoints/workOrder";
import type {
  WorkOrderListItemResponse,
  WorkOrderResponse,
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
  const [selected, setSelected] = useState<WorkOrderListItemResponse | null>(
    null,
  );
  const [detail, setDetail] = useState<WorkOrderResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openDetail = async (wo: WorkOrderListItemResponse) => {
    setSelected(wo);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await workOrderApi.getWorkOrder(wo.id));
    } catch (err) {
      t.error(
        err instanceof Error
          ? err.message
          : "Không tải được chi tiết phiếu sửa chữa",
      );
    } finally {
      setDetailLoading(false);
    }
  };

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
            Nguồn:{" "}
            <code className="text-xs bg-bgsoft px-1.5 py-0.5 rounded">
              GET /api/work-orders
            </code>{" "}
            · {items.length} phiếu
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
                        onClick={() => void openDetail(w)}
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
                        onClick={() => void openDetail(w)}
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

      {/* Modal chi tiết */}
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
                <div className="text-xs text-ink-muted mb-1">Mã phiếu</div>
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
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-muted">Trạng thái</div>
                    <div className="mt-1">
                      <Badge tone={STATUS_TONE[detail.status] ?? "default"}>
                        {STATUS_LABEL[detail.status] ?? detail.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">Khách hàng</div>
                    <div className="font-semibold text-xs">
                      {detail.customer?.fullName ?? "—"}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {detail.customer?.phone ?? ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">Phương tiện</div>
                    <div className="font-semibold text-xs">
                      {detail.vehicle
                        ? `${detail.vehicle.make ?? ""} ${detail.vehicle.model ?? ""}`.trim() ||
                          "—"
                        : "—"}
                    </div>
                    <div className="text-[11px] text-ink-muted font-mono">
                      {detail.vehicle?.licensePlate ?? ""}
                    </div>
                  </div>
                </div>

                {detail.customerNote && (
                  <div className="bg-bgsoft/60 rounded-lg p-3 text-sm text-ink-light">
                    <span className="font-medium text-ink">Ghi chú khách: </span>
                    {detail.customerNote}
                  </div>
                )}

                {detail.estimates.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                      Báo giá
                    </h4>
                    <div className="border border-ink/8 rounded-xl divide-y divide-ink/5">
                      {detail.estimates.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between gap-3 p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-semibold">
                              {e.code}
                            </div>
                            <div className="text-[11px] text-ink-muted">
                              {e.type} · {e.status}
                            </div>
                          </div>
                          <div className="font-semibold text-primary shrink-0">
                            {e.totalAmount.toLocaleString("vi-VN")}đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.statusHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                      Lịch sử trạng thái
                    </h4>
                    <div className="space-y-1.5">
                      {detail.statusHistory.map((h) => (
                        <div
                          key={h.id}
                          className="text-xs flex items-center gap-2 flex-wrap"
                        >
                          <span className="text-ink-muted">
                            {fmtTime(h.createdAt)}
                          </span>
                          <span className="text-ink">
                            {h.statusFrom ?? "—"} →{" "}
                            <strong>{h.statusTo}</strong>
                          </span>
                          {h.note && (
                            <span className="text-ink-muted">({h.note})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-ink-muted">
                Không tải được chi tiết phiếu sửa chữa.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
