/**
 * AdminWorkOrderDetail — chi tiết phiếu sửa chữa + vòng đời estimate.
 *
 * Nguồn dữ liệu (work-order-service):
 *  - GET    /api/work-orders/{id}                     → chi tiết phiếu
 *  - POST   /api/work-orders/{id}/start-diagnosis     → CREATED → DIAGNOSING
 *  - POST   /api/work-orders/{id}/complete            → IN_PROGRESS → COMPLETED
 *  - POST   /api/work-orders/{id}/cancel              → huỷ phiếu
 *  - GET    /api/work-orders/{id}/estimates           → danh sách báo giá
 *  - POST   /api/work-orders/{id}/estimates           → tạo báo giá
 *  - GET    /api/estimates/{id}                       → chi tiết báo giá
 *  - POST   /api/estimates/{id}/services              → thêm dịch vụ
 *  - DELETE /api/estimates/{id}/services/{lineId}     → gỡ dịch vụ
 *  - POST   /api/estimates/{id}/parts                 → thêm phụ tùng
 *  - DELETE /api/estimates/{id}/parts/{lineId}        → gỡ phụ tùng
 *  - POST   /api/estimates/{id}/submit                → gửi duyệt
 *  - PATCH  /api/estimates/{id}/decision              → ghi nhận quyết định
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconClose,
  IconRefresh,
  IconWarning,
  IconCheck,
  IconTrash,
  IconPlus,
  IconWrench,
  IconPackage,
  IconArrowRight,
  IconActivity,
  IconClock,
  IconUsers,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import {
  estimateApi,
  workOrderApi,
  workOrderPartApi,
  workOrderServiceLineApi,
} from "../../api/endpoints/workOrder";
import { inventoryApi } from "../../api/endpoints/inventory";
import { staffApi } from "../../api/endpoints/staff";
import { hasTokenAuthority } from "../../api/session";
import type {
  EstimateResponse,
  EstimateStatus,
  EstimateSummaryResponse,
  EstimateType,
  PartResponse,
  ServiceResponse,
  StaffResponse,
  WorkOrderPartLineResponse,
  WorkOrderPartStatus,
  WorkOrderResponse,
  WorkOrderServiceStatus,
  WorkOrderStatus,
} from "../../api/types";

// ── Nhãn & màu ────────────────────────────────────────────────────────────────

export const WO_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  CREATED: "Mới tạo",
  DIAGNOSING: "Đang chẩn đoán",
  PENDING_APPROVAL: "Chờ duyệt",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành",
  PENDING_PAYMENT: "Chờ thanh toán",
  CLOSED: "Đã đóng",
  CANCELED: "Đã huỷ",
};

export const WO_STATUS_TONE: Record<
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

const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PARTIALLY_APPROVED: "Duyệt một phần",
  REJECTED: "Bị từ chối",
};

const ESTIMATE_TYPE_LABEL: Record<EstimateType, string> = {
  INITIAL: "Báo giá ban đầu",
  SUPPLEMENTARY: "Báo giá bổ sung",
};

const SERVICE_LINE_STATUS_LABEL: Record<WorkOrderServiceStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
};

/**
 * Từ khoá nhận diện chức vụ kỹ thuật viên trong `staff.position`.
 *
 * Backend lưu chức vụ bằng tiếng Việt không dấu ("Ky thuat vien chinh",
 * "Ky thuat vien"), nên so khớp chuỗi tiếng Anh ("MECHANIC") sẽ không bao giờ
 * trúng. Chuẩn hoá về chữ in hoa rồi so "contains" cho cả hai cách viết.
 */
const MECHANIC_POSITION_KEYWORDS = [
  "MECHANIC",
  "TECHNICIAN",
  "KY THUAT",
  "KYTECH",
  "SERVICE_ADVISOR",
  "TU VAN",
  "TUVAN",
  "MANAGER",
  "QUAN LY",
  "QUANLY",
];

/**
 * Giới hạn số lượng xuất/trả theo đúng công thức của backend.
 *
 * Backend (`WorkOrderPartTransaction.remainingReserved`) tính:
 *   remaining = reserved - issued - released
 * và trả lỗi 400 nếu `quantity` vượt quá `remaining`. Frontend phải clamp
 * theo đúng công thức này, nếu không người dùng sẽ thấy lỗi khó hiểu.
 */
function clampQty(
  line: WorkOrderPartLineResponse,
  requested: number | undefined,
): number {
  const remaining = Math.max(
    0,
    line.reservedQuantity - line.issuedQuantity - line.releasedQuantity,
  );
  const qty = Math.max(1, Math.floor(requested ?? 1));
  return Math.min(qty, Math.max(1, remaining));
}

const PART_STATUS_LABEL: Record<WorkOrderPartStatus, string> = {
  PENDING: "Chờ duyệt",  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  PARTIALLY_RESERVED: "Đã giữ một phần",
  RESERVED: "Đã giữ kho",
  FAILED: "Giữ kho thất bại",
  ISSUED: "Đã xuất",
  RETURNED: "Đã trả lại",
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString("vi-VN")}đ`;
}

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

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  workOrderId: string;
  onClose: () => void;
  /** Được gọi sau mỗi thay đổi trạng thái phiếu để list bên ngoài reload. */
  onChanged?: () => void;
}

export default function AdminWorkOrderDetail({
  workOrderId,
  onClose,
  onChanged,
}: Props) {
  const t = useToast();

  const [order, setOrder] = useState<WorkOrderResponse | null>(null);
  const [estimates, setEstimates] = useState<EstimateSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Estimate đang mở chi tiết. */
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Quyền — lấy từ claim `authorities` của access token.
  const can = useCallback(
    (authority: string) => hasTokenAuthority(authority),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, list] = await Promise.all([
        workOrderApi.getWorkOrder(workOrderId),
        estimateApi.listByWorkOrder(workOrderId).catch(() => []),
      ]);
      setOrder(detail);
      setEstimates(list);
      return detail;
    } catch (err) {
      setOrder(null);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được chi tiết phiếu sửa chữa",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Mở estimate đầu tiên (nếu có) để người dùng không phải bấm thêm.
  useEffect(() => {
    if (!activeEstimateId && estimates.length > 0) {
      setActiveEstimateId(estimates[0].id);
    }
    if (activeEstimateId && !estimates.some((e) => e.id === activeEstimateId)) {
      setActiveEstimateId(estimates[0]?.id ?? null);
    }
  }, [estimates, activeEstimateId]);

  const loadEstimate = useCallback(async (estimateId: string) => {
    setEstimateLoading(true);
    try {
      const data = await estimateApi.getEstimate(estimateId);
      setEstimate(data);
      return data;
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không tải được chi tiết báo giá",
      );
      return null;
    } finally {
      setEstimateLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeEstimateId) void loadEstimate(activeEstimateId);
    else setEstimate(null);
  }, [activeEstimateId, loadEstimate]);

  // Sau khi duyệt báo giá, backend xử lý giữ kho bất đồng bộ qua Kafka
  // (PartsReservationRequestedEvent → PartsReservedEvent). Ngay sau khi bấm
  // "Lưu quyết định", phần tử vẫn hiển thị "Đã duyệt", nên cần vài lần thử
  // lại theo lịch để bắt được trạng thái RESERVED và phiếu IN_PROGRESS.
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    setPolling(false);
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  /**
   * Bắt đầu polling trong `durationMs`, dừng sớm nếu `until()` trả về true.
   *
   * `until` nhận dữ liệu vừa tải về nên điều kiện dừng luôn phản ánh trạng
   * thái thật của backend, không phụ thuộc vào state React (state có thể đã
   * cũ lúc callback chạy).
   */
  const startPolling = useCallback(
    (durationMs: number, until?: (o: WorkOrderResponse, e: EstimateResponse | null) => boolean) => {
      setPolling(true);
      const startedAt = Date.now();
      const tick = async () => {
        const [o, e] = await Promise.all([
          load(),
          activeEstimateId ? loadEstimate(activeEstimateId) : Promise.resolve(null),
        ]);
        if (
          (until && o && until(o, e)) ||
          Date.now() - startedAt > durationMs
        ) {
          stopPolling();
          return;
        }
        pollTimer.current = setTimeout(tick, 2000);
      };
      pollTimer.current = setTimeout(tick, 1500);
    },
    [load, loadEstimate, activeEstimateId, stopPolling],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  /** Gọi hành động phiếu rồi reload cả phiếu lẫn estimate đang mở. */
  const runAction = useCallback(
    async (fn: () => Promise<unknown>, successMessage: string) => {
      setBusy(true);
      try {
        await fn();
        t.success(successMessage);
        await load();
        if (activeEstimateId) await loadEstimate(activeEstimateId);
        onChanged?.();
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Thao tác không thành công",
        );
      } finally {
        setBusy(false);
      }
    },
    [t, load, loadEstimate, activeEstimateId, onChanged],
  );

  if (loading) {
    return (
      <ModalShell title="Đang tải..." onClose={onClose}>
        <div className="py-10 text-center text-sm text-ink-muted">
          Đang tải chi tiết phiếu sửa chữa...
        </div>
      </ModalShell>
    );
  }

  if (error || !order) {
    return (
      <ModalShell title="Không tải được phiếu" onClose={onClose}>
        <div className="py-10 text-center">
          <p className="text-sm text-ink-muted mb-4">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh size={14} /> Thử lại
          </Button>
        </div>
      </ModalShell>
    );
  }

  const canStartDiagnosis =
    order.status === "CREATED" && can("WORK_ORDER_DIAGNOSIS_START");
  const canComplete =
    order.status === "IN_PROGRESS" && can("WORK_ORDER_COMPLETE");
  const canCancel =
    ["CREATED", "DIAGNOSING", "PENDING_APPROVAL"].includes(order.status) &&
    can("WORK_ORDER_CANCEL");
  const canCreateEstimate =
    ["DIAGNOSING", "IN_PROGRESS"].includes(order.status) &&
    can("ESTIMATE_CREATE");

  return (
    <ModalShell
      title={order.code}
      subtitle={`Phiếu sửa chữa · ${WO_STATUS_LABEL[order.status]}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        {/* ── Tổng quan ── */}
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <InfoBox label="Trạng thái">
            <Badge tone={WO_STATUS_TONE[order.status]}>
              {WO_STATUS_LABEL[order.status]}
            </Badge>
          </InfoBox>
          <InfoBox label="Khách hàng">
            <div className="font-semibold text-xs">
              {order.customer?.fullName ?? "—"}
            </div>
            <div className="text-[11px] text-ink-muted">
              {order.customer?.phone ?? ""}
            </div>
          </InfoBox>
          <InfoBox label="Phương tiện">
            <div className="font-semibold text-xs">
              {order.vehicle
                ? `${order.vehicle.make ?? ""} ${order.vehicle.model ?? ""}`.trim() ||
                  "—"
                : "—"}
            </div>
            <div className="text-[11px] text-ink-muted font-mono">
              {order.vehicle?.licensePlate ?? ""}
            </div>
          </InfoBox>
          <InfoBox label="ODO vào">
            <div className="font-semibold text-xs">
              {order.odometerIn != null
                ? `${order.odometerIn.toLocaleString("vi-VN")} km`
                : "—"}
            </div>
            {order.odometerOut != null && (
              <div className="text-[11px] text-ink-muted">
                ra: {order.odometerOut.toLocaleString("vi-VN")} km
              </div>
            )}
          </InfoBox>
        </div>

        {(order.customerNote || order.vehicleCondition) && (
          <div className="bg-bgsoft/60 rounded-lg p-3 text-sm text-ink-light space-y-1">
            {order.customerNote && (
              <div>
                <span className="font-medium text-ink">Ghi chú khách: </span>
                {order.customerNote}
              </div>
            )}
            {order.vehicleCondition && (
              <div>
                <span className="font-medium text-ink">Tình trạng xe: </span>
                {order.vehicleCondition}
              </div>
            )}
          </div>
        )}

        {/* ── Thao tác vòng đời ── */}
        <div className="flex gap-2 flex-wrap">
          {canStartDiagnosis && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => workOrderApi.startDiagnosis(order.id),
                  "Đã bắt đầu chẩn đoán",
                )
              }
            >
              <IconArrowRight size={14} /> Bắt đầu chẩn đoán
            </Button>
          )}
          {canComplete && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => workOrderApi.completeWorkOrder(order.id),
                  "Đã hoàn thành phiếu sửa chữa",
                )
              }
            >
              <IconCheck size={14} /> Hoàn thành
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    "Huỷ phiếu sửa chữa? Phụ tùng còn giữ trong kho sẽ được giải phóng.",
                  )
                )
                  return;
                void runAction(
                  () => workOrderApi.cancelWorkOrder(order.id),
                  "Đã huỷ phiếu sửa chữa",
                );
              }}
            >
              <IconClose size={14} /> Huỷ phiếu
            </Button>
          )}
          {canCreateEstimate && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const type: EstimateType =
                  order.status === "DIAGNOSING" ? "INITIAL" : "SUPPLEMENTARY";
                void runAction(
                  () => estimateApi.createEstimate(order.id, { type }),
                  `Đã tạo ${ESTIMATE_TYPE_LABEL[type].toLowerCase()}`,
                );
              }}
            >
              <IconPlus size={14} />
              {order.status === "DIAGNOSING"
                ? "Tạo báo giá ban đầu"
                : "Tạo báo giá bổ sung"}
            </Button>
          )}
        </div>

        {!can("WORK_ORDER_CREATE") && (
          <AuthorityHint message="Bạn không có quyền tạo phiếu sửa chữa (WORK_ORDER_CREATE)." />
        )}

        {/* ── Báo giá ── */}
        <section>
          <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
            Báo giá ({estimates.length})
          </h4>
          {estimates.length === 0 ? (
            <div className="text-sm text-ink-muted border border-ink/8 rounded-xl p-4">
              Chưa có báo giá nào.
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap mb-3">
              {estimates.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setActiveEstimateId(e.id)}
                  className={[
                    "text-left px-3 py-2 rounded-xl border transition-colors text-sm",
                    activeEstimateId === e.id
                      ? "border-primary bg-primary/5"
                      : "border-ink/10 hover:border-primary/40",
                  ].join(" ")}
                >
                  <div className="font-mono font-semibold text-xs">{e.code}</div>
                  <div className="text-[11px] text-ink-muted">
                    {ESTIMATE_TYPE_LABEL[e.type as EstimateType] ??
                      e.type}{" "}
                    · {ESTIMATE_STATUS_LABEL[e.status as EstimateStatus] ??
                      e.status}
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeEstimateId && (
            <EstimatePanel
              estimate={estimate}
              loading={estimateLoading}
              workOrder={order}
              polling={polling}
              onChanged={async () => {
                await load();
                await loadEstimate(activeEstimateId);
                onChanged?.();
              }}
              onDecided={async () => {
                // Chờ Kafka giữ kho xong rồi polling để cập nhật trạng thái.
                // Dừng sớm khi mọi dòng phụ tùng đã sang RESERVED/FAILED và
                // phiếu đã rời PENDING_APPROVAL.
                startPolling(30000, (o, e) => {
                  if (!e) return false;
                  const parts = e.partLines ?? [];
                  const settled =
                    parts.length > 0 &&
                    parts.every((p) =>
                      ["RESERVED", "PARTIALLY_RESERVED", "FAILED", "ISSUED"].includes(
                        p.status,
                      ),
                    );
                  return settled && o.status !== "PENDING_APPROVAL";
                });
              }}
            />
          )}
        </section>

        {/* ── Lịch sử trạng thái ── */}
        {order.statusHistory.length > 0 && (
          <section>
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <IconActivity size={13} /> Lịch sử trạng thái
            </h4>
            <div className="space-y-1.5">
              {order.statusHistory.map((h) => (
                <div
                  key={h.id}
                  className="text-xs flex items-center gap-2 flex-wrap"
                >
                  <span className="text-ink-muted inline-flex items-center gap-1">
                    <IconClock size={11} />
                    {fmtTime(h.createdAt)}
                  </span>
                  <span className="text-ink">
                    {h.statusFrom ?? "—"} → <strong>{h.statusTo}</strong>
                  </span>
                  {h.note && (
                    <span className="text-ink-muted">({h.note})</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
}

// =========================
// Estimate panel
// =========================

function EstimatePanel({
  estimate,
  loading,
  workOrder,
  polling,
  onChanged,
  onDecided,
}: {
  estimate: EstimateResponse | null;
  loading: boolean;
  workOrder: WorkOrderResponse;
  polling?: boolean;
  onChanged: () => Promise<void>;
  onDecided?: () => Promise<void> | void;
}) {
  const t = useToast();
  const [busy, setBusy] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showDecision, setShowDecision] = useState(false);

  const can = useCallback((a: string) => hasTokenAuthority(a), []);

  if (loading || !estimate) {
    return (
      <div className="border border-ink/8 rounded-xl p-6 text-center text-sm text-ink-muted">
        Đang tải báo giá...
      </div>
    );
  }

  const editable = estimate.status === "DRAFT";
  const pendingItems = [
    ...estimate.serviceLines
      .filter((l) => l.status === "PENDING")
      .map((l) => ({ type: "SERVICE" as const, id: l.id, label: l.snapshotName ?? l.id })),
    ...estimate.partLines
      .filter((l) => l.status === "PENDING")
      .map((l) => ({ type: "PART" as const, id: l.id, label: l.snapshotName ?? l.id })),
  ];

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      t.success(msg);
      await onChanged();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Thao tác không thành công");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-ink/8 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-bgsoft/40 border-b border-ink/8 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="font-mono font-bold text-sm">{estimate.code}</span>
          <span className="text-[11px] text-ink-muted ml-2">
            {ESTIMATE_TYPE_LABEL[estimate.type]} ·{" "}
            {ESTIMATE_STATUS_LABEL[estimate.status]}
          </span>
          {polling && (
            <span className="ml-2 text-[11px] text-primary inline-flex items-center gap-1">
              <IconRefresh size={11} className="animate-spin" />
              Đang chờ giữ kho...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">
              Tổng
            </div>
            <div className="font-bold text-primary">
              {fmtMoney(estimate.totalAmount)}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void onChanged()}>
            <IconRefresh size={13} />
          </Button>
        </div>
      </div>

      {/* Tổng tiền */}
      <div className="px-4 py-2 bg-bgsoft/20 border-b border-ink/8 flex gap-5 text-[11px] text-ink-muted">
        <span>
          Công: <strong className="text-ink">{fmtMoney(estimate.totalLaborAmount)}</strong>
        </span>
        <span>
          Phụ tùng:{" "}
          <strong className="text-ink">{fmtMoney(estimate.totalPartsAmount)}</strong>
        </span>
      </div>

      {/* Service lines */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <IconWrench size={12} /> Dịch vụ ({estimate.serviceLines.length})
          </h5>
          {editable && can("ESTIMATE_UPDATE") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddService((v) => !v)}
            >
              <IconPlus size={13} /> Thêm dịch vụ
            </Button>
          )}
        </div>

        {showAddService && (
          <AddServiceToEstimate
            estimateId={estimate.id}
            onClose={() => setShowAddService(false)}
            onAdded={async () => {
              setShowAddService(false);
              await onChanged();
            }}
          />
        )}

        {estimate.serviceLines.length === 0 ? (
          <p className="text-xs text-ink-muted">Chưa có dịch vụ nào.</p>
        ) : (
          <div className="divide-y divide-ink/5 border border-ink/8 rounded-lg">
            {estimate.serviceLines.map((line) => (
              <div
                key={line.id}
                className="px-3 py-2 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {line.snapshotName ?? "—"}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {line.durationMinutes ?? 0} phút ·{" "}
                    {line.requiredTechs ?? 1} kỹ thuật viên
                    {line.assignedTechId && (
                      <span className="ml-1 font-mono">
                        · đã gán {line.assignedTechId.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    tone={
                      line.status === "COMPLETED"
                        ? "accent"
                        : line.status === "APPROVED"
                          ? "primary"
                          : line.status === "REJECTED"
                            ? "default"
                            : "warning"
                    }
                  >
                    {SERVICE_LINE_STATUS_LABEL[line.status]}
                  </Badge>
                  <span className="font-semibold text-xs">
                    {fmtMoney(line.totalPrice)}
                  </span>
                  {editable && can("ESTIMATE_UPDATE") && (
                    <button
                      onClick={() =>
                        void act(
                          () =>
                            estimateApi.removeService(estimate.id, line.id),
                          "Đã gỡ dịch vụ khỏi báo giá",
                        )
                      }
                      className="p-1 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                      title="Gỡ dịch vụ"
                    >
                      <IconTrash size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Part lines */}
      <div className="p-3 border-t border-ink/8">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <IconPackage size={12} /> Phụ tùng ({estimate.partLines.length})
          </h5>
          {editable && can("ESTIMATE_UPDATE") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddPart((v) => !v)}
            >
              <IconPlus size={13} /> Thêm phụ tùng
            </Button>
          )}
        </div>

        {showAddPart && (
          <AddPartToEstimate
            estimateId={estimate.id}
            onClose={() => setShowAddPart(false)}
            onAdded={async () => {
              setShowAddPart(false);
              await onChanged();
            }}
          />
        )}

        {estimate.partLines.length === 0 ? (
          <p className="text-xs text-ink-muted">Chưa có phụ tùng nào.</p>
        ) : (
          <div className="divide-y divide-ink/5 border border-ink/8 rounded-lg">
            {estimate.partLines.map((line) => (
              <div
                key={line.id}
                className="px-3 py-2 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {line.snapshotName ?? "—"}
                  </div>
                  <div className="text-[11px] text-ink-muted font-mono">
                    {line.snapshotSku ?? "—"} · yêu cầu {line.requestedQuantity}{" "}
                    {line.snapshotUnit ?? ""} · giữ {line.reservedQuantity} · xuất{" "}
                    {line.issuedQuantity}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    tone={
                      line.status === "ISSUED"
                        ? "accent"
                        : line.status === "APPROVED" ||
                            line.status === "RESERVED"
                          ? "primary"
                          : line.status === "REJECTED" ||
                              line.status === "FAILED"
                            ? "default"
                            : "warning"
                    }
                  >
                    {PART_STATUS_LABEL[line.status]}
                  </Badge>
                  <span className="font-semibold text-xs">
                    {fmtMoney(line.totalPrice)}
                  </span>
                  {editable && can("ESTIMATE_UPDATE") && (
                    <button
                      onClick={() =>
                        void act(
                          () => estimateApi.removePart(estimate.id, line.id),
                          "Đã gỡ phụ tùng khỏi báo giá",
                        )
                      }
                      className="p-1 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                      title="Gỡ phụ tùng"
                    >
                      <IconTrash size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thao tác estimate */}
      <div className="px-3 py-3 border-t border-ink/8 bg-bgsoft/20 flex gap-2 flex-wrap">
        {estimate.status === "DRAFT" && can("ESTIMATE_SUBMIT") && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void act(
                () => estimateApi.submit(estimate.id),
                "Đã gửi báo giá để khách duyệt",
              )
            }
          >
            <IconArrowRight size={14} /> Gửi duyệt
          </Button>
        )}
        {estimate.status === "PENDING_APPROVAL" &&
          can("ESTIMATE_DECISION_RECORD") && (
            <Button
              size="sm"
              disabled={busy || pendingItems.length === 0}
              onClick={() => setShowDecision((v) => !v)}
            >
              <IconCheck size={14} /> Ghi nhận quyết định
            </Button>
          )}
        {showDecision && (
          <DecisionForm
            estimate={estimate}
            pendingItems={pendingItems}
            onCancel={() => setShowDecision(false)}
            onSubmit={async (items) => {
              setShowDecision(false);
              await act(
                () => estimateApi.decide(estimate.id, { items }),
                "Đã ghi nhận quyết định của khách",
              );
              // Giữ kho phụ tùng xử lý bất đồng bộ qua Kafka.
              await onDecided?.();
            }}
          />
        )}
      </div>

      {/* Phân công & xuất kho — chỉ khi Work Order IN_PROGRESS */}
      {workOrder.status === "IN_PROGRESS" && (
        <ServiceLineOps
          estimate={estimate}
          workOrderId={workOrder.id}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

// =========================
// Thêm dịch vụ / phụ tùng
// =========================

function AddServiceToEstimate({
  estimateId,
  onClose,
  onAdded,
}: {
  estimateId: string;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const t = useToast();
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inventoryApi
      .listServices({ keyword: keyword || undefined, size: 30 })
      .then((page) => setServices(page.items ?? []))
      .catch(() => setServices([]));
  }, [keyword]);

  const add = async (serviceId: string) => {
    setBusy(true);
    try {
      await estimateApi.addService(estimateId, { serviceId });
      t.success("Đã thêm dịch vụ vào báo giá");
      await onAdded();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Không thêm được dịch vụ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-ink/8 rounded-lg p-3 mb-3 bg-bgsoft/30">
      <div className="flex items-center justify-between mb-2">
        <input
          type="text"
          placeholder="Tìm dịch vụ theo tên..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
        />
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted ml-2"
          aria-label="Đóng"
        >
          <IconClose size={16} />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {services.length === 0 && (
          <p className="text-xs text-ink-muted">Không tìm thấy dịch vụ.</p>
        )}
        {services.map((s) => (
          <button
            key={s.id}
            disabled={busy}
            onClick={() => void add(s.id)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white text-sm flex items-center justify-between gap-2 disabled:opacity-50"
          >
            <span className="truncate">
              {s.name}
              <span className="text-[11px] text-ink-muted ml-1 font-mono">
                {s.code}
              </span>
            </span>
            <span className="text-xs text-ink-muted shrink-0">
              {fmtMoney(s.baseLaborPrice)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AddPartToEstimate({
  estimateId,
  onClose,
  onAdded,
}: {
  estimateId: string;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const t = useToast();
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});

  useEffect(() => {
    inventoryApi
      .listParts({ keyword: keyword || undefined, size: 30 })
      .then((page) => setParts(page.items ?? []))
      .catch(() => setParts([]));
  }, [keyword]);

  const add = async (partId: string) => {
    const quantity = qty[partId] ?? 1;
    setBusy(true);
    try {
      await estimateApi.addPart(estimateId, { partId, quantity });
      t.success("Đã thêm phụ tùng vào báo giá");
      await onAdded();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Không thêm được phụ tùng");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-ink/8 rounded-lg p-3 mb-3 bg-bgsoft/30">
      <div className="flex items-center justify-between mb-2">
        <input
          type="text"
          placeholder="Tìm phụ tùng theo tên hoặc SKU..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
        />
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted ml-2"
          aria-label="Đóng"
        >
          <IconClose size={16} />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {parts.length === 0 && (
          <p className="text-xs text-ink-muted">Không tìm thấy phụ tùng.</p>
        )}
        {parts.map((p) => (
          <div
            key={p.id}
            className="px-2.5 py-1.5 rounded-lg hover:bg-white text-sm flex items-center justify-between gap-2"
          >
            <span className="truncate">
              {p.name}
              <span className="text-[11px] text-ink-muted ml-1 font-mono">
                {p.sku}
              </span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={1}
                value={qty[p.id] ?? 1}
                onChange={(e) =>
                  setQty((prev) => ({
                    ...prev,
                    [p.id]: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-14 h-8 px-2 rounded-lg border border-ink/15 text-xs outline-none focus:border-primary"
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void add(p.id)}
              >
                <IconPlus size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================
// Quyết định khách hàng
// =========================

function DecisionForm({
  estimate,
  pendingItems,
  onCancel,
  onSubmit,
}: {
  estimate: EstimateResponse;
  pendingItems: {
    type: "SERVICE" | "PART";
    id: string;
    label: string;
  }[];
  onCancel: () => void;
  onSubmit: (
    items: {
      itemType: "SERVICE" | "PART";
      itemId: string;
      decision: "APPROVED" | "REJECTED";
    }[],
  ) => Promise<void>;
}) {
  const [decisions, setDecisions] = useState<
    Record<string, "APPROVED" | "REJECTED">
  >({});

  const allDecided = pendingItems.every((i) => decisions[i.id]);

  return (
    <div className="w-full border border-ink/8 rounded-lg p-3 bg-white">
      <p className="text-xs text-ink-muted mb-2">
        Quyết định của khách cho từng hạng mục. Phải quyết định tất cả{" "}
        {pendingItems.length} hạng mục còn chờ — nếu bỏ sót, báo giá giữ nguyên
        trạng thái chờ duyệt.
      </p>
      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {pendingItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="truncate">
              <span className="text-[10px] uppercase text-ink-muted mr-1.5">
                {item.type === "SERVICE" ? "DV" : "PT"}
              </span>
              {item.label}
            </span>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() =>
                  setDecisions((prev) => ({ ...prev, [item.id]: "APPROVED" }))
                }
                className={[
                  "text-[11px] px-2 py-1 rounded-lg border",
                  decisions[item.id] === "APPROVED"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "border-ink/15 hover:border-emerald-400",
                ].join(" ")}
              >
                Duyệt
              </button>
              <button
                onClick={() =>
                  setDecisions((prev) => ({ ...prev, [item.id]: "REJECTED" }))
                }
                className={[
                  "text-[11px] px-2 py-1 rounded-lg border",
                  decisions[item.id] === "REJECTED"
                    ? "bg-red-500 text-white border-red-500"
                    : "border-ink/15 hover:border-red-400",
                ].join(" ")}
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end mt-3">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          size="sm"
          disabled={!allDecided}
          onClick={() =>
            void onSubmit(
              pendingItems.map((i) => ({
                itemType: i.type,
                itemId: i.id,
                decision: decisions[i.id],
              })),
            )
          }
        >
          <IconCheck size={13} /> Lưu quyết định
        </Button>
      </div>
    </div>
  );
}

// =========================
// Phân công & xuất kho
// =========================

function ServiceLineOps({
  estimate,
  workOrderId,
  onChanged,
}: {
  estimate: EstimateResponse;
  workOrderId: string;
  onChanged: () => Promise<void>;
}) {
  const t = useToast();
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [issueQty, setIssueQty] = useState<Record<string, number>>({});

  /** Gán số lượng, tối thiểu 1. */
  const setQty = useCallback((lineId: string, raw: string) => {
    setIssueQty((prev) => ({
      ...prev,
      [lineId]: Math.max(1, Number(raw) || 1),
    }));
  }, []);

  const can = useCallback((a: string) => hasTokenAuthority(a), []);

  useEffect(() => {
    if (!can("SERVICE_LINE_ASSIGN")) return;
    staffApi
      .listStaff({ isActive: true, size: 50 })
      .then((page) => setStaff(page.items ?? []))
      .catch(() => setStaff([]));
  }, [can]);

  const mechanics = useMemo(
    () =>
      staff.filter(
        (s) =>
          !s.position ||
          MECHANIC_POSITION_KEYWORDS.some((kw) =>
            (s.position ?? "").toUpperCase().includes(kw),
          ),
      ),
    [staff],
  );

  const act = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(id);
    try {
      await fn();
      t.success(msg);
      await onChanged();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Thao tác không thành công");
    } finally {
      setBusyId(null);
      setAssignFor(null);
    }
  };

  const approvedLines = estimate.serviceLines.filter(
    (l) => l.status === "APPROVED" || l.status === "IN_PROGRESS",
  );

  return (
    <div className="px-3 py-3 border-t border-ink/8 bg-bgsoft/10 space-y-2">
      {/* Phân công */}
      {can("SERVICE_LINE_ASSIGN") && approvedLines.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <IconUsers size={12} /> Phân công kỹ thuật viên
          </h5>
          <div className="space-y-1">
            {approvedLines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-ink">
                  {line.snapshotName ?? line.id}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-ink-muted font-mono">
                    {line.assignedTechId
                      ? `TV: ${line.assignedTechId.slice(0, 8)}…`
                      : "chưa gán"}
                  </span>
                  {assignFor === line.id ? (
                    <select
                      autoFocus
                      defaultValue=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        void act(
                          line.id,
                          () =>
                            workOrderServiceLineApi.assign(
                              line.id,
                              e.target.value,
                            ),
                          "Đã phân công kỹ thuật viên",
                        );
                      }}
                      onBlur={() => setAssignFor(null)}
                      className="h-7 px-2 rounded-lg border border-ink/15 bg-white text-[11px] outline-none focus:border-primary"
                    >
                      <option value="">-- chọn --</option>
                      {mechanics.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName ?? s.employeeCode ?? s.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setAssignFor(line.id)}
                      className="text-[11px] px-2 py-1 rounded-lg border border-ink/15 hover:border-primary text-ink-muted"
                    >
                      Gán
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Xuất / trả phụ tùng */}
      {estimate.partLines.length > 0 &&
        (can("PART_ISSUE") || can("PART_RELEASE")) && (
          <div>
            <h5 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <IconPackage size={12} /> Xuất / trả phụ tùng
            </h5>
            <div className="space-y-1">
              {estimate.partLines.map((line) => {
                // Backend tính phần còn lại = reserved - issued - released
                // (xem WorkOrderPartTransaction.remainingReserved). Phải khớp
                // đúng công thức này, nếu không sẽ cho xuất/trả vượt quá số
                // đang giữ chỗ và backend trả lỗi 400.
                const remaining =
                  line.reservedQuantity -
                  line.issuedQuantity -
                  line.releasedQuantity;
                const issuedNet = line.issuedQuantity - line.releasedQuantity;
                return (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-2 text-xs flex-wrap"
                  >
                    <span className="truncate text-ink">
                      {line.snapshotName ?? line.id}
                      <span className="text-[11px] text-ink-muted ml-1 font-mono">
                        giữ {line.reservedQuantity} · xuất {line.issuedQuantity}
                        {line.releasedQuantity > 0 &&
                          ` · trả ${line.releasedQuantity}`}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, remaining)}
                        value={issueQty[line.id] ?? 1}
                        onChange={(e) =>
                          setQty(line.id, e.target.value)
                        }
                        className="w-14 h-7 px-2 rounded-lg border border-ink/15 text-[11px] outline-none focus:border-primary"
                      />
                      {can("PART_ISSUE") && remaining > 0 && (
                        <button
                          disabled={busyId === line.id}
                          onClick={() =>
                            void act(
                              line.id,
                              () =>
                                workOrderPartApi.issue(
                                  workOrderId,
                                  line.id,
                                  clampQty(line, issueQty[line.id]),
                                ),
                              "Đã xuất phụ tùng",
                            )
                          }
                          className="text-[11px] px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Xuất
                        </button>
                      )}
                      {can("PART_RELEASE") && issuedNet > 0 && (
                        <button
                          disabled={busyId === line.id}
                          onClick={() =>
                            void act(
                              line.id,
                              () =>
                                workOrderPartApi.release(
                                  workOrderId,
                                  line.id,
                                  clampQty(line, issueQty[line.id]),
                                ),
                              "Đã trả phụ tùng về kho",
                            )
                          }
                          className="text-[11px] px-2 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                          Trả
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}

// =========================
// Sub-components
// =========================

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={[
          "bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto p-5",
          wide ? "max-w-4xl" : "max-w-2xl",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-bold text-lg truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bgsoft shrink-0"
            aria-label="Đóng"
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function AuthorityHint({ message }: { message: string }) {
  return (
    <p className="text-xs text-ink-muted flex items-center gap-1">
      <IconWarning size={12} />
      {message}
    </p>
  );
}
