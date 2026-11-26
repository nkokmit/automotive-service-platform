/**
 * Modal chi tiết + modal soạn thảo cho đơn nhập hàng (Purchase Order).
 *
 * Tách riêng khỏi `AdminPurchaseOrders.tsx` để file chính tập trung vào
 * bảng danh sách + điều phối trạng thái.
 */
import { useMemo, useState } from "react";
import {
  IconCheck,
  IconClose,
  IconPlus,
  IconTrash,
  IconTruck,
  IconWarning,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { inventoryApi } from "../../api/endpoints/inventory";
import type {
  PartResponse,
  PurchaseOrderResponse,
  SupplierResponse,
} from "../../api/types";
import { formatFullVND } from "../../utils/format";

export const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  APPROVED: "Đã duyệt",
  RECEIVED: "Đã nhập kho",
  CANCELED: "Đã huỷ",
};

export const PO_STATUS_TONE: Record<
  string,
  "default" | "primary" | "warning" | "accent"
> = {
  DRAFT: "default",
  APPROVED: "warning",
  RECEIVED: "accent",
  CANCELED: "default",
};

/** Đơn chỉ sửa được khi còn ở trạng thái DRAFT. */
export function canEditPo(status: string): boolean {
  return status === "DRAFT";
}

/** Đơn chỉ huỷ được khi DRAFT hoặc APPROVED (đã nhập kho thì không huỷ được). */
export function canCancelPo(status: string): boolean {
  return status === "DRAFT" || status === "APPROVED";
}

/** Đơn chỉ nhập kho được khi đã được duyệt. */
export function canReceivePo(status: string): boolean {
  return status === "APPROVED";
}

// =========================
// Modal chi tiết
// =========================

export function PurchaseOrderDetailModal({
  order,
  canWrite,
  busy,
  onClose,
  onApprove,
  onComplete,
  onCancel,
}: {
  order: PurchaseOrderResponse;
  canWrite: boolean;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const items = order.items ?? [];
  const total = Number(order.totalAmount ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              {order.code}
              <Badge tone={PO_STATUS_TONE[order.status] ?? "default"}>
                {PO_STATUS_LABEL[order.status] ?? order.status}
              </Badge>
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              Nhà cung cấp: {order.supplierName} · Ngày tạo:{" "}
              {new Date(order.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {order.note && (
            <div className="text-sm text-ink-light bg-bgsoft rounded-xl px-4 py-3">
              {order.note}
            </div>
          )}

          <div className="overflow-x-auto border border-ink/8 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase bg-bgsoft/60">
                  <th className="font-medium px-3 py-2.5">Phụ tùng</th>
                  <th className="font-medium px-3 py-2.5 text-center">SL</th>
                  <th className="font-medium px-3 py-2.5 text-right">Giá nhập</th>
                  <th className="font-medium px-3 py-2.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-ink-muted">
                      Đơn chưa có mặt hàng.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="border-t border-ink/5">
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{it.partName}</div>
                        <div className="text-xs text-ink-muted">{it.partSku}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">{it.quantity}</td>
                      <td className="px-3 py-2.5 text-right">
                        {formatFullVND(Number(it.importPrice ?? 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {formatFullVND(Number(it.totalPrice ?? 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink/8 bg-bgsoft/40">
                  <td colSpan={3} className="px-3 py-2.5 text-right font-semibold">
                    Tổng tiền
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-primary">
                    {formatFullVND(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.receivedAt && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <IconCheck size={15} />
              Đã nhập kho lúc{" "}
              {new Date(order.receivedAt).toLocaleString("vi-VN")}
            </div>
          )}
        </div>

        {/* Footer — hành động theo trạng thái */}
        {canWrite && (
          <div className="p-5 border-t border-ink/8 flex gap-2 justify-end sticky bottom-0 bg-white">
            {canCancelPo(order.status) && (
              <Button variant="outline" onClick={onCancel} disabled={busy}>
                <IconClose size={14} />
                Huỷ đơn
              </Button>
            )}
            {order.status === "DRAFT" && (
              <Button onClick={onApprove} disabled={busy}>
                <IconCheck size={14} />
                Duyệt đơn
              </Button>
            )}
            {canReceivePo(order.status) && (
              <Button onClick={onComplete} disabled={busy}>
                <IconTruck size={14} />
                Nhập kho
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================
// Modal soạn thảo đơn
// =========================

interface DraftLine {
  partId: string;
  quantity: number;
  importPrice: number;
}

export function PurchaseOrderEditor({
  order,
  suppliers,
  parts,
  onClose,
  onSaved,
}: {
  /** Đơn đang sửa — null nghĩa là tạo mới. */
  order: PurchaseOrderResponse | null;
  suppliers: SupplierResponse[];
  parts: PartResponse[];
  onClose: () => void;
  onSaved: (saved: PurchaseOrderResponse) => void;
}) {
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? "");
  const [note, setNote] = useState(order?.note ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    order?.items?.map((it) => ({
      partId: it.partId,
      quantity: it.quantity,
      importPrice: Number(it.importPrice ?? 0),
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partById = useMemo(() => {
    const map = new Map<string, PartResponse>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.importPrice) || 0),
        0,
      ),
    [lines],
  );

  const setLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { partId: "", quantity: 1, importPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!supplierId) {
      setError("Vui lòng chọn nhà cung cấp.");
      return;
    }
    if (lines.length === 0) {
      setError("Đơn nhập hàng phải có ít nhất một mặt hàng.");
      return;
    }

    const seen = new Set<string>();
    for (const l of lines) {
      if (!l.partId) {
        setError("Vui lòng chọn phụ tùng cho mọi dòng hàng.");
        return;
      }
      if (seen.has(l.partId)) {
        setError("Danh sách mặt hàng bị lặp phụ tùng.");
        return;
      }
      seen.add(l.partId);
      if (!Number(l.quantity) || Number(l.quantity) < 1) {
        setError("Số lượng phải lớn hơn 0.");
        return;
      }
      if (Number(l.importPrice) < 0) {
        setError("Giá nhập không được âm.");
        return;
      }
    }

    const payload = {
      // `code` chỉ gửi khi sửa đơn cũ — đơn mới để backend tự sinh mã
      // (PO-yyyyMMddHHmmss-XXXX).
      code: order?.code ?? undefined,
      supplierId,
      note: note.trim() || null,
      items: lines.map((l) => ({
        partId: l.partId,
        quantity: Number(l.quantity),
        importPrice: Number(l.importPrice),
      })),
    };

    setSaving(true);
    try {
      const saved = order
        ? await inventoryApi.updatePurchaseOrder(order.id, payload)
        : await inventoryApi.createPurchaseOrder(payload);
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không lưu được đơn nhập hàng",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
          <h3 className="font-bold text-base">
            {order ? "Sửa đơn nhập hàng" : "Tạo đơn nhập hàng"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <IconWarning size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Nhà cung cấp <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-ink">
                Mặt hàng <span className="text-red-500">*</span>
              </label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <IconPlus size={13} />
                Thêm dòng
              </Button>
            </div>

            {lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink/15 py-6 text-center text-sm text-ink-muted">
                Chưa có mặt hàng. Bấm "Thêm dòng" để bắt đầu.
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((l, i) => {
                  const part = partById.get(l.partId);
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.4fr_auto] gap-2 items-end border border-ink/8 rounded-xl p-3"
                    >
                      <div>
                        <label className="text-[11px] text-ink-muted mb-1 block">
                          Phụ tùng
                        </label>
                        <select
                          value={l.partId}
                          onChange={(e) => {
                            const next = partById.get(e.target.value);
                            setLine(i, {
                              partId: e.target.value,
                              importPrice:
                                next && !l.importPrice
                                  ? Number(next.sellingPrice ?? 0)
                                  : l.importPrice,
                            });
                          }}
                          className="w-full h-10 px-2.5 rounded-lg border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Chọn --</option>
                          {parts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                        {part && (
                          <span className="text-[11px] text-ink-muted">
                            Tồn khả dụng: {part.availableStock} {part.unit}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] text-ink-muted mb-1 block">
                          Số lượng
                        </label>
                        <Input
                          type="number"
                          value={String(l.quantity)}
                          onChange={(e) =>
                            setLine(i, { quantity: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-ink-muted mb-1 block">
                          Giá nhập (VNĐ)
                        </label>
                        <Input
                          type="number"
                          value={String(l.importPrice)}
                          onChange={(e) =>
                            setLine(i, { importPrice: Number(e.target.value) })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="p-2 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                        title="Xoá dòng"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ghi chú cho đơn nhập hàng..."
              className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <span className="text-sm text-ink-muted mr-auto">
              Tổng:{" "}
              <strong className="text-primary text-base">
                {formatFullVND(total)}
              </strong>
            </span>
          </div>
        </div>

        <div className="p-5 border-t border-ink/8 flex gap-2 justify-end sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            <IconCheck size={14} />
            {saving ? "Đang lưu..." : order ? "Cập nhật đơn" : "Tạo đơn"}
          </Button>
        </div>
      </div>
    </div>
  );
}
