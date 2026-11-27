/**
 * TechnicianWorkOrders — không gian làm việc của kỹ thuật viên.
 *
 * Nguồn dữ liệu (work-order-service):
 *  - GET  /api/work-order-service-lines/me           → các service line được giao
 *  - POST /api/work-order-service-lines/{id}/start    → APPROVED → IN_PROGRESS
 *  - POST /api/work-order-service-lines/{id}/complete → IN_PROGRESS → COMPLETED
 *
 * Yêu cầu authority: `SERVICE_LINE_READ_ASSIGNED`, `SERVICE_LINE_START`,
 * `SERVICE_LINE_COMPLETE` (role MECHANIC / ADMIN / MANAGER).
 *
 * Route: `/admin/work-orders/mine` — tách riêng khỏi danh sách phiếu của xưởng
 * vì kỹ thuật viên chỉ được thấy đúng các hạng mục được giao cho mình.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconWrench,
  IconRefresh,
  IconClock,
  IconCheck,
  IconArrowRight,
  IconWarning,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { workOrderServiceLineApi } from "../../api/endpoints/workOrder";
import { hasTokenAuthority } from "../../api/session";
import type {
  AssignedServiceLineResponse,
  WorkOrderServiceStatus,
} from "../../api/types";

const STATUS_FILTERS: { id: "all" | WorkOrderServiceStatus; label: string }[] =
  [
    { id: "all", label: "Tất cả" },
    { id: "APPROVED", label: "Chờ bắt đầu" },
    { id: "IN_PROGRESS", label: "Đang làm" },
    { id: "COMPLETED", label: "Hoàn thành" },
  ];

const STATUS_LABEL: Record<WorkOrderServiceStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Chờ bắt đầu",
  REJECTED: "Bị từ chối",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
};

const STATUS_TONE: Record<
  WorkOrderServiceStatus,
  "default" | "primary" | "warning" | "accent"
> = {
  PENDING: "warning",
  APPROVED: "primary",
  REJECTED: "default",
  IN_PROGRESS: "primary",
  COMPLETED: "accent",
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

export default function TechnicianWorkOrders() {
  const t = useToast();
  const [lines, setLines] = useState<AssignedServiceLineResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<
    "all" | WorkOrderServiceStatus
  >("all");

  const canRead = hasTokenAuthority("SERVICE_LINE_READ_ASSIGNED");
  const canStart = hasTokenAuthority("SERVICE_LINE_START");
  const canComplete = hasTokenAuthority("SERVICE_LINE_COMPLETE");

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError(
        "Tài khoản của bạn không có quyền SERVICE_LINE_READ_ASSIGNED — chỉ kỹ thuật viên (và quản lý) mới xem được danh sách này.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await workOrderServiceLineApi.listMyLines();
      setLines(data ?? []);
    } catch (err) {
      setLines([]);
      // 6107 = STAFF_PROFILE_NOT_FOUND: tài khoản đăng nhập chưa có hồ sơ
      // nhân viên trong staff-service → không thể có hạng mục được giao.
      const code = (err as { code?: number } | null)?.code;
      if (code === 6107) {
        setError(
          "Tài khoản của bạn chưa có hồ sơ nhân viên trong staff-service, nên chưa thể được giao hạng mục nào. Hãy liên hệ quản trị viên tạo hồ sơ (Trang → Kỹ thuật viên) và liên kết với tài khoản đăng nhập.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách hạng mục được giao",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      activeStatus === "all"
        ? lines
        : lines.filter((l) => l.status === activeStatus),
    [lines, activeStatus],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", lines.length);
    for (const l of lines) map.set(l.status, (map.get(l.status) ?? 0) + 1);
    return map;
  }, [lines]);

  const act = async (
    line: AssignedServiceLineResponse,
    fn: () => Promise<unknown>,
    msg: string,
  ) => {
    setBusyId(line.id);
    try {
      await fn();
      t.success(msg);
      await load();
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Thao tác không thành công",
      );
    } finally {
      setBusyId(null);
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
            Hạng mục được giao
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {lines.length} hạng mục
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
                activeStatus === s.id ? "bg-white/25" : "bg-bgsoft",
              ].join(" ")}
            >
              {counts.get(s.id) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <IconWarning size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách */}
      {loading ? (
        <div className="bg-white border border-ink/8 rounded-2xl p-10 text-center text-sm text-ink-muted">
          Đang tải hạng mục...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-ink/8 rounded-2xl p-10 text-center text-sm text-ink-muted">
          Không có hạng mục nào phù hợp.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((line) => (
            <div
              key={line.id}
              className="bg-white border border-ink/8 rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {line.snapshotName ?? "—"}
                  </div>
                  <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                    Phiếu {line.workOrderCode}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[line.status] ?? "default"}>
                  {STATUS_LABEL[line.status] ?? line.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <IconClock size={11} />
                  {line.durationMinutes ?? 0} phút
                </span>
                <span>{line.requiredTechs ?? 1} kỹ thuật viên</span>
                <span className="font-semibold text-ink">
                  {line.totalPrice.toLocaleString("vi-VN")}đ
                </span>
              </div>

              {line.completedAt && (
                <div className="text-[11px] text-ink-muted">
                  Hoàn thành lúc {fmtTime(line.completedAt)}
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                {line.status === "APPROVED" && canStart && (
                  <Button
                    size="sm"
                    disabled={busyId === line.id}
                    onClick={() =>
                      void act(
                        line,
                        () => workOrderServiceLineApi.start(line.id),
                        "Đã bắt đầu hạng mục",
                      )
                    }
                  >
                    <IconArrowRight size={13} /> Bắt đầu
                  </Button>
                )}
                {line.status === "IN_PROGRESS" && canComplete && (
                  <Button
                    size="sm"
                    disabled={busyId === line.id}
                    onClick={() =>
                      void act(
                        line,
                        () => workOrderServiceLineApi.complete(line.id),
                        "Đã hoàn thành hạng mục",
                      )
                    }
                  >
                    <IconCheck size={13} /> Hoàn thành
                  </Button>
                )}
                {line.status === "PENDING" && (
                  <p className="text-[11px] text-ink-muted">
                    Hạng mục đang chờ khách duyệt báo giá.
                  </p>
                )}
                {line.status === "REJECTED" && (
                  <p className="text-[11px] text-ink-muted">
                    Khách đã từ chối hạng mục này.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
