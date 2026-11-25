/**
 * AdminPurchaseOrders — quản lý đơn nhập hàng (Purchase Order) của kho.
 *
 * Nguồn dữ liệu (inventory-service):
 *  - GET  /api/purchase-orders          → danh sách đơn (lọc keyword/status/supplier)
 *  - GET  /api/purchase-orders/{id}     → chi tiết đơn kèm dòng hàng
 *  - POST /api/purchase-orders          → tạo đơn (DRAFT)
 *  - PUT  /api/purchase-orders/{id}     → sửa đơn (chỉ khi DRAFT)
 *  - POST /api/purchase-orders/{id}/approve  → DRAFT → APPROVED
 *  - POST /api/purchase-orders/{id}/complete → APPROVED → RECEIVED (nhập kho)
 *  - POST /api/purchase-orders/{id}/cancel   → huỷ đơn
 *
 * Cần authority: PURCHASE_ORDER_READ (xem) / PURCHASE_ORDER_WRITE (ghi).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconTruck,
  IconRefresh,
  IconPlus,
  IconClose,
  IconEye,
  IconEdit,
  IconSearch,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import {
  ConfirmModal,
  type AdminTableColumn,
  type AdminTableFilter,
} from "../../components/AdminTable";
import { inventoryApi } from "../../api/endpoints/inventory";
import { hasTokenAuthority } from "../../api/session";
import type {
  PartResponse,
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  SupplierResponse,
} from "../../api/types";
import { formatFullVND } from "../../utils/format";
import {
  PO_STATUS_LABEL,
  PO_STATUS_TONE,
  PurchaseOrderDetailModal,
  PurchaseOrderEditor,
} from "./AdminPurchaseOrderForms";

// =========================
// Nhãn trạng thái đơn nhập hàng
// =========================

/** Đơn chỉ sửa được khi còn ở trạng thái DRAFT. */
function canEdit(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT";
}

/** Đơn chỉ huỷ được khi DRAFT hoặc APPROVED (đã nhập kho thì không huỷ được). */
function canCancel(status: PurchaseOrderStatus): boolean {
  return status === "DRAFT" || status === "APPROVED";
}

// =========================
// Bảng danh sách
// =========================

const columns: AdminTableColumn<PurchaseOrderResponse>[] = [
  {
    key: "code",
    label: "Đơn nhập hàng",
    render: (po) => (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <IconTruck size={16} />
        </span>
        <div className="min-w-0">
          <span className="font-semibold text-sm line-clamp-1 block">{po.code}</span>
          <div className="text-xs text-ink-muted line-clamp-1">
            {po.supplierName}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    hideOnMobile: true,
    render: (po) => (
      <Badge tone="default">{po.supplierName}</Badge>
    ),
  },
  {
    key: "total",
    label: "Tổng tiền",
    align: "right",
    render: (po) => (
      <span className="font-semibold text-sm text-primary">
        {formatFullVND(Number(po.totalAmount ?? 0))}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    align: "center",
    hideOnMobile: true,
    render: (po) => (
      <span className="text-xs text-ink-muted">
        {new Date(po.createdAt).toLocaleDateString("vi-VN")}
      </span>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (po) => (
      <Badge tone={PO_STATUS_TONE[po.status]}>
        {PO_STATUS_LABEL[po.status] ?? po.status}
      </Badge>
    ),
  },
];

const filters: AdminTableFilter<PurchaseOrderResponse>[] = [
  { id: "draft", label: "Nháp", predicate: (po) => po.status === "DRAFT" },
  {
    id: "approved",
    label: "Đã duyệt",
    predicate: (po) => po.status === "APPROVED",
  },
  {
    id: "received",
    label: "Đã nhập kho",
    predicate: (po) => po.status === "RECEIVED",
  },
  {
    id: "canceled",
    label: "Đã huỷ",
    predicate: (po) => po.status === "CANCELED",
  },
];

/** Ánh xạ id của filter chip → trạng thái tương ứng gửi lên server. */
const STATUS_BY_FILTER_ID: Record<string, PurchaseOrderStatus> = {
  draft: "DRAFT",
  approved: "APPROVED",
  received: "RECEIVED",
  canceled: "CANCELED",
};

/**
 * Lọc server-side cho danh sách đơn nhập hàng.
 *
 * <p>`GET /api/purchase-orders` hỗ trợ `keyword` và `status` — cả hai đều lọc
 * ở server nên danh sách không bị cắt bởi `size=100`.
 */

// =========================
// Dòng hàng (dùng chung modal tạo/sửa)
// =========================

interface DraftLine {
  partId: string;
  quantity: number;
  importPrice: number;
}

function lineTotal(line: DraftLine): number {
  return (Number(line.quantity) || 0) * (Number(line.importPrice) || 0);
}

// =========================
// AdminPurchaseOrders
// =========================

export default function AdminPurchaseOrders() {
  const t = useToast();
  const [orders, setOrders] = useState<PurchaseOrderResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Đơn đang mở chi tiết. */
  const [detail, setDetail] = useState<PurchaseOrderResponse | null>(null);
  /** Modal tạo / sửa đơn. */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrderResponse | null>(null);
  /** Modal huỷ đơn. */
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrderResponse | null>(
    null,
  );
  /** Ô tìm kiếm (chưa áp dụng) — chỉ gửi lên server khi bấm "Tìm" / Enter. */
  const [keywordInput, setKeywordInput] = useState("");
  /** Từ khoá đã áp dụng (`keyword` của `/api/purchase-orders`). */
  const [keyword, setKeyword] = useState("");
  /** Trạng thái đang lọc (`null` = không lọc). */
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | null>(
    null,
  );
  /**
   * Số đơn theo từng trạng thái, tính từ một lần gọi **không lọc**.
   *
   * <p>Giữ riêng khỏi `orders` vì `orders` đã bị lọc theo `statusFilter` /
   * `keyword` ở server — đếm trên `orders` sẽ cho số 0 cho mọi trạng thái
   * không khớp bộ lọc hiện tại.
   */
  const [allCounts, setAllCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const canWrite = hasTokenAuthority("PURCHASE_ORDER_WRITE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [poRes, supRes, partRes, allRes] = await Promise.all([
        inventoryApi.listPurchaseOrders({
          size: 100,
          keyword: keyword.trim() || undefined,
          status: statusFilter ?? undefined,
        }),
        inventoryApi.listSuppliers({ isActive: true, size: 100 }),
        inventoryApi.listParts({ isActive: true, size: 100 }),
        // Lần gọi không lọc — chỉ dùng để đếm số đơn theo trạng thái.
        inventoryApi.listPurchaseOrders({ size: 100 }),
      ]);
      setOrders(poRes.items ?? []);
      setSuppliers(supRes.items ?? []);
      setParts(partRes.items ?? []);

      const counts: Record<string, number> = {};
      for (const po of allRes.items ?? []) {
        counts[po.status] = (counts[po.status] ?? 0) + 1;
      }
      setAllCounts({
        draft: counts.DRAFT ?? 0,
        approved: counts.APPROVED ?? 0,
        received: counts.RECEIVED ?? 0,
        canceled: counts.CANCELED ?? 0,
      });
    } catch (err) {
      setOrders([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách đơn nhập hàng từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tải lại chi tiết một đơn (dùng sau khi duyệt / nhập kho / huỷ). */
  const refreshDetail = useCallback(async (id: string) => {
    try {
      const fresh = await inventoryApi.getPurchaseOrder(id);
      setDetail(fresh);
      setOrders((prev) => prev.map((o) => (o.id === id ? fresh : o)));
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không tải lại được chi tiết đơn",
      );
    }
  }, [t]);

  const openDetail = useCallback(
    async (po: PurchaseOrderResponse) => {
      // Hiện modal ngay với dữ liệu rút gọn, rồi thay bằng bản chi tiết
      // (có dòng hàng) khi request xong.
      setDetail(po);
      await refreshDetail(po.id);
    },
    [refreshDetail],
  );

  /**
   * Mở modal sửa đơn.
   *
   * <p>`GET /api/purchase-orders` trả DTO rút gọn với `items = []` (backend
   * dùng `toSummary`), nên phải gọi thêm endpoint chi tiết để lấy dòng hàng
   * trước khi cho sửa — nếu không, người dùng sẽ sửa một đơn không có mặt
   * hàng và ghi đè mất dòng cũ.
   */
  const openEditor = useCallback(
    async (po: PurchaseOrderResponse) => {
      try {
        const full = await inventoryApi.getPurchaseOrder(po.id);
        setEditing(full);
        setEditorOpen(true);
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không tải được chi tiết đơn",
        );
      }
    },
    [t],
  );

  const handleApprove = useCallback(
    async (po: PurchaseOrderResponse) => {
      setBusy(true);
      try {
        const updated = await inventoryApi.approvePurchaseOrder(po.id);
        setDetail(updated);
        setOrders((prev) => prev.map((o) => (o.id === po.id ? updated : o)));
        t.success(`Đã duyệt đơn ${updated.code}`);
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không duyệt được đơn nhập hàng",
        );
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const handleComplete = useCallback(
    async (po: PurchaseOrderResponse) => {
      setBusy(true);
      try {
        const updated = await inventoryApi.completePurchaseOrder(po.id);
        setDetail(updated);
        setOrders((prev) => prev.map((o) => (o.id === po.id ? updated : o)));
        t.success(`Đã nhập kho đơn ${updated.code}`);
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không nhập kho được đơn",
        );
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const updated = await inventoryApi.cancelPurchaseOrder(cancelTarget.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setDetail((prev) => (prev && prev.id === updated.id ? updated : prev));
      setCancelTarget(null);
      t.success(`Đã huỷ đơn ${updated.code}`);
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không huỷ được đơn nhập hàng",
      );
    } finally {
      setBusy(false);
    }
  }, [cancelTarget, t]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconTruck size={20} />
            </span>
            Đơn nhập hàng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải danh sách đơn nhập hàng..."
              : `${orders.length} đơn nhập hàng trong hệ thống`}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <IconPlus size={16} />
            Tạo đơn nhập hàng
          </Button>
        )}
      </div>

      {/* Bộ lọc trạng thái + tìm kiếm — lọc ở server (`status` / `keyword`) */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter(null)}
            className={[
              "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
              statusFilter === null
                ? "bg-primary text-white"
                : "bg-bgsoft text-ink-muted hover:bg-ink/10",
            ].join(" ")}
          >
            Tất cả
          </button>
          {filters.map((f) => {
            const status = STATUS_BY_FILTER_ID[f.id];
            const active = statusFilter === status;
            // Đếm trên tập đã lọc — nếu đang lọc theo trạng thái khác thì số
            // của trạng thái này không còn ý nghĩa, hiển thị "—".
            const count = statusFilter && !active ? null : allCounts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(active ? null : status)}
                className={[
                  "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
                  active
                    ? "bg-primary text-white"
                    : "bg-bgsoft text-ink-muted hover:bg-ink/10",
                ].join(" ")}
              >
                {f.label} ({count ?? "—"})
              </button>
            );
          })}

          <div className="flex-1 min-w-[220px] ml-auto">
            <Input
              placeholder="Tìm theo mã đơn, tên nhà cung cấp..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setKeyword(keywordInput);
              }}
              leftIcon={<IconSearch size={16} />}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKeyword(keywordInput)}
          >
            <IconSearch size={14} />
            Tìm
          </Button>
          {keyword !== keywordInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeywordInput("");
                setKeyword("");
              }}
            >
              Xoá
            </Button>
          )}
        </div>
      </Card>

      {/* Bảng */}
      <Card hover={false}>
        {orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Chưa có đơn nhập hàng nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={[
                        "font-medium px-4 py-3 whitespace-nowrap",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.hideOnMobile && "hidden md:table-cell",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={[
                          "px-4 py-3 align-middle",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.hideOnMobile && "hidden md:table-cell",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {col.render(po)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => void openDetail(po)}
                          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                          title="Xem chi tiết"
                        >
                          <IconEye size={15} />
                        </button>
                        {canWrite && canEdit(po.status) && (
                          <button
                            onClick={() => void openEditor(po)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Sửa đơn"
                          >
                            <IconEdit size={15} />
                          </button>
                        )}
                        {canWrite && canCancel(po.status) && (
                          <button
                            onClick={() => setCancelTarget(po)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-red-500"
                            title="Huỷ đơn"
                          >
                            <IconClose size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal chi tiết đơn */}
      {detail && (
        <PurchaseOrderDetailModal
          order={detail}
          canWrite={canWrite}
          busy={busy}
          onClose={() => setDetail(null)}
          onApprove={() => void handleApprove(detail)}
          onComplete={() => void handleComplete(detail)}
          onCancel={() => setCancelTarget(detail)}
        />
      )}

      {/* Modal tạo / sửa đơn */}
      {editorOpen && (
        <PurchaseOrderEditor
          order={editing}
          suppliers={suppliers}
          parts={parts}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSaved={(saved) => {
            setEditorOpen(false);
            setEditing(null);
            setOrders((prev) =>
              editing
                ? prev.map((o) => (o.id === saved.id ? saved : o))
                : [saved, ...prev],
            );
            t.success(
              editing ? "Đã cập nhật đơn nhập hàng" : "Đã tạo đơn nhập hàng",
            );
          }}
        />
      )}

      {/* Modal huỷ đơn */}
      {cancelTarget && (
        <ConfirmModal
          title="Huỷ đơn nhập hàng?"
          description={
            <>
              Bạn có chắc muốn huỷ đơn{" "}
              <strong>{cancelTarget.code}</strong> của nhà cung cấp{" "}
              <strong>{cancelTarget.supplierName}</strong>? Đơn đã nhập kho thì
              không huỷ được.
            </>
          }
          confirmLabel="Huỷ đơn"
          confirmTone="danger"
          loading={busy}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => void handleCancel()}
        />
      )}
    </div>
  );
}
