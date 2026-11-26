/**
 * AdminServiceBom — quản lý định mức phụ tùng (BOM) của một dịch vụ.
 *
 * Nguồn dữ liệu (inventory-service):
 *  - GET    /api/services/{id}/bom           → danh sách định mức
 *  - POST   /api/services/{id}/bom           → thêm phụ tùng vào định mức
 *  - PUT    /api/services/{id}/bom/{bomId}   → sửa số lượng mặc định / ghi chú
 *  - DELETE /api/services/{id}/bom/{bomId}   → gỡ dòng định mức
 *
 * Cần authority: SERVICE_READ (xem) / SERVICE_WRITE (ghi).
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconPackage,
  IconPlus,
  IconTrash,
  IconRefresh,
  IconCheck,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { inventoryApi } from "../../api/endpoints/inventory";
import { hasTokenAuthority } from "../../api/session";
import type { PartResponse, ServiceBomResponse, ServiceResponse } from "../../api/types";

// =========================
// Ô nhập số lượng mặc định (controlled)
// =========================

/**
 * Ô nhập số lượng mặc định của một dòng định mức.
 *
 * <p>Dùng state thay vì `defaultValue` của `<input>`: sau khi lưu, backend
 * trả về danh sách BOM mới (giá trị có thể đã bị chuẩn hoá) — `defaultValue`
 * không cập nhật lại giá trị của input đã render, nên ô sẽ hiển thị số cũ.
 *
 * <p>Lưu khi blur (rời ô) hoặc nhấn Enter. Chỉ gọi API khi giá trị thực sự
 * khác giá trị server đang trả về.
 */
function BomQtyCell({
  row,
  onSave,
}: {
  row: ServiceBomResponse;
  onSave: (quantity: number) => void;
}) {
  const [value, setValue] = useState<number>(row.default_quantity ?? 1);
  const serverValue = row.default_quantity ?? 1;

  // Đồng bộ lại khi server trả giá trị mới (sau khi lưu hoặc reload).
  useEffect(() => {
    setValue(serverValue);
  }, [serverValue]);

  const commit = () => {
    const next = Number(value);
    if (!next || next < 1) {
      setValue(serverValue);
      return;
    }
    if (next !== serverValue) onSave(next);
  };

  return (
    <input
      type="number"
      min={1}
      value={String(value)}
      onChange={(e) => setValue(Number(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-20 h-9 px-2 text-center rounded-lg border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
    />
  );
}

// =========================
// AdminServiceBom
// =========================

export default function AdminServiceBom() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const t = useToast();

  const [service, setService] = useState<ServiceResponse | null>(null);
  const [bom, setBom] = useState<ServiceBomResponse[]>([]);
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Phụ tùng đang chọn trong form thêm. */
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const canWrite = hasTokenAuthority("SERVICE_WRITE");

  const load = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    setError(null);
    try {
      const [svc, bomRes, partRes] = await Promise.all([
        inventoryApi.getService(serviceId),
        inventoryApi.getServiceBom(serviceId),
        inventoryApi.listParts({ isActive: true, size: 100, sortBy: "name" }),
      ]);
      setService(svc);
      setBom(bomRes ?? []);
      setParts(partRes.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được định mức phụ tùng từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!serviceId) return;
    if (!partId) {
      t.error("Vui lòng chọn phụ tùng.");
      return;
    }
    if (!Number(quantity) || Number(quantity) < 1) {
      t.error("Số lượng mặc định phải lớn hơn 0.");
      return;
    }
    setBusy(true);
    try {
      await inventoryApi.addServiceBomItem(serviceId, {
        partId,
        default_quantity: Number(quantity),
        note: note.trim() || null,
      });
      setPartId("");
      setQuantity(1);
      setNote("");
      await load();
      t.success("Đã thêm phụ tùng vào định mức");
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không thêm được vào định mức",
      );
    } finally {
      setBusy(false);
    }
  }, [serviceId, partId, quantity, note, load, t]);

  const handleUpdateQty = useCallback(
    async (row: ServiceBomResponse, nextQty: number) => {
      if (!serviceId) return;
      if (!nextQty || nextQty < 1) {
        t.error("Số lượng mặc định phải lớn hơn 0.");
        return;
      }
      try {
        await inventoryApi.updateServiceBomItem(serviceId, row.id, {
          default_quantity: nextQty,
          note: row.note,
        });
        await load();
      } catch (err) {
        t.error(err instanceof Error ? err.message : "Không cập nhật được định mức");
      }
    },
    [serviceId, load, t],
  );

  const handleDelete = useCallback(
    async (row: ServiceBomResponse) => {
      if (!serviceId) return;
      try {
        await inventoryApi.deleteServiceBomItem(serviceId, row.id);
        await load();
        t.success("Đã gỡ phụ tùng khỏi định mức");
      } catch (err) {
        t.error(err instanceof Error ? err.message : "Không gỡ được khỏi định mức");
      }
    },
    [serviceId, load, t],
  );

  const usedPartIds = new Set(bom.map((b) => b.partId));

  return (
    <div className="space-y-4">
      <Link
        to="/admin/services"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary"
      >
        <IconArrowLeft size={14} />
        Quay lại danh sách dịch vụ
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <IconPackage size={20} />
          </span>
          Định mức phụ tùng
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {loading
            ? "Đang tải..."
            : `${service?.name ?? "Dịch vụ"} · ${bom.length} phụ tùng trong định mức`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

      {canWrite && (
        <Card hover={false}>
          <div className="p-4">
            <div className="text-sm font-semibold mb-3">Thêm phụ tùng</div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_auto] gap-3 items-end">
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Phụ tùng
                </label>
                <select
                  value={partId}
                  onChange={(e) => setPartId(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">-- Chọn phụ tùng --</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id} disabled={usedPartIds.has(p.id)}>
                      {p.name} ({p.sku})
                      {usedPartIds.has(p.id) ? " — đã có trong định mức" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  SL mặc định
                </label>
                <Input
                  type="number"
                  value={String(quantity)}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Ghi chú</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: bắt buộc dùng loại chính hãng"
                />
              </div>
              <Button onClick={() => void handleAdd()} disabled={busy}>
                <IconPlus size={14} />
                Thêm
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card hover={false}>
        {bom.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Dịch vụ này chưa có định mức phụ tùng."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Phụ tùng</th>
                  <th className="font-medium px-4 py-3">SKU</th>
                  <th className="font-medium px-4 py-3 text-center">
                    SL mặc định
                  </th>
                  <th className="font-medium px-4 py-3">Ghi chú</th>
                  {canWrite && (
                    <th className="font-medium px-4 py-3 text-right">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {bom.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{row.partName}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {row.partSku}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canWrite ? (
                        <BomQtyCell
                          row={row}
                          onSave={(qty) => void handleUpdateQty(row, qty)}
                        />
                      ) : (
                        <Badge tone="default">{row.default_quantity}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {row.note || "—"}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void handleDelete(row)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                          title="Gỡ khỏi định mức"
                        >
                          <IconTrash size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted flex items-center gap-2">
          <IconCheck size={12} />
          Sửa số lượng mặc định rồi bấm ra ngoài ô nhập để lưu.
        </div>
      </Card>
    </div>
  );
}
