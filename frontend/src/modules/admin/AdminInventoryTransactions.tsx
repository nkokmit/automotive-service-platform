/**
 * AdminInventoryTransactions — sổ nhật ký biến động tồn kho.
 *
 * Nguồn dữ liệu: GET /api/inventory-transactions (inventory-service)
 * Lọc theo: phụ tùng, loại giao dịch, loại tham chiếu, mã tham chiếu, khoảng
 * thời gian.
 *
 * Cần authority: INVENTORY_TRANSACTION_READ.
 *
 * Lưu ý về ngữ nghĩa cột tồn (theo javadoc của `InventoryTransactionResponse`):
 *  - IMPORT / EXPORT / RETURN / ADJUSTMENT → `stockBefore`/`stockAfter` là tồn
 *    thực (on_hand).
 *  - RESERVE / RELEASE → `stockBefore`/`stockAfter` là tồn giữ chỗ (reserved).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconActivity,
  IconRefresh,
  IconFilter,
  IconWarning,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { inventoryApi } from "../../api/endpoints/inventory";
import type {
  InventoryReferenceType,
  InventoryTransactionResponse,
  InventoryTransactionType,
  PartResponse,
} from "../../api/types";

// =========================
// Nhãn loại giao dịch
// =========================

const TX_TYPE_LABEL: Record<InventoryTransactionType, string> = {
  IMPORT: "Nhập kho",
  EXPORT: "Xuất kho",
  RESERVE: "Giữ chỗ",
  RELEASE: "Giải phóng",
  RETURN: "Trả lại",
  ADJUSTMENT: "Điều chỉnh",
};

const TX_TYPE_TONE: Record<
  InventoryTransactionType,
  "default" | "primary" | "warning" | "accent"
> = {
  IMPORT: "accent",
  EXPORT: "primary",
  RESERVE: "warning",
  RELEASE: "default",
  RETURN: "default",
  ADJUSTMENT: "warning",
};

/** Loại tham chiếu → nhãn tiếng Việt. */
const REF_TYPE_LABEL: Record<InventoryReferenceType, string> = {
  PURCHASE_ORDER: "Đơn nhập hàng",
  WORK_ORDER: "Phiếu sửa chữa",
  STOCK_TAKE: "Kiểm kê",
};

/**
 * Giao dịch làm tồn TĂNG hay GIẢM.
 *
 * <p>`quantity` trong sổ kho luôn là số **dương** — dấu được suy ra từ loại giao
 * dịch:
 *  - `IMPORT` / `RETURN`  → tăng tồn thực
 *  - `EXPORT`             → giảm tồn thực
 *  - `RESERVE`            → tăng tồn **giữ chỗ**
 *  - `RELEASE`            → giảm tồn **giữ chỗ**
 *
 * <p>`ADJUSTMENT` chưa có nơi phát sinh trong backend (kiểm kê tồn chưa
 * implement), nên dấu được suy từ `stockAfter` so với `stockBefore` cho chắc.
 */
function isIncrease(tx: InventoryTransactionResponse): boolean {
  switch (tx.type) {
    case "IMPORT":
    case "RETURN":
    case "RESERVE":
      return true;
    case "EXPORT":
    case "RELEASE":
      return false;
    case "ADJUSTMENT":
    default:
      return (tx.stockAfter ?? 0) >= (tx.stockBefore ?? 0);
  }
}

/**
 * `stockBefore`/`stockAfter` mang **hai nghĩa** khác nhau: với
 * `IMPORT`/`EXPORT`/`RETURN`/`ADJUSTMENT` là tồn thực, với `RESERVE`/`RELEASE`
 * là tồn giữ chỗ. UI cần ghi chú để người dùng không đọc nhầm.
 */
function isReservedScope(tx: InventoryTransactionResponse): boolean {
  return tx.type === "RESERVE" || tx.type === "RELEASE";
}

const TX_TYPES: InventoryTransactionType[] = [
  "IMPORT",
  "EXPORT",
  "RESERVE",
  "RELEASE",
  "RETURN",
  "ADJUSTMENT",
];

const REF_TYPES: InventoryReferenceType[] = [
  "PURCHASE_ORDER",
  "WORK_ORDER",
  "STOCK_TAKE",
];

// =========================
// AdminInventoryTransactions
// =========================

export default function AdminInventoryTransactions() {
  const [transactions, setTransactions] = useState<
    InventoryTransactionResponse[]
  >([]);
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [partId, setPartId] = useState("");
  const [type, setType] = useState<InventoryTransactionType | "">("");
  const [refType, setRefType] = useState<InventoryReferenceType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /** Chuẩn hoá `YYYY-MM-DD` thành ISO instant để backend parse được. */
  function toInstant(date: string, endOfDay = false): string | undefined {
    if (!date) return undefined;
    return endOfDay ? `${date}T23:59:59Z` : `${date}T00:00:00Z`;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, partRes] = await Promise.all([
        inventoryApi.listInventoryTransactions({
          partId: partId || undefined,
          type: type || undefined,
          referenceType: refType || undefined,
          fromDate: toInstant(fromDate),
          toDate: toInstant(toDate, true),
          size: 100,
        }),
        inventoryApi.listParts({ size: 100, sortBy: "name" }),
      ]);
      setTransactions(txRes.items ?? []);
      setParts(partRes.items ?? []);
    } catch (err) {
      setTransactions([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được sổ nhật ký kho từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [partId, type, refType, fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = useCallback(() => {
    setPartId("");
    setType("");
    setRefType("");
    setFromDate("");
    setToDate("");
  }, []);

  const hasFilter = useMemo(
    () => !!(partId || type || refType || fromDate || toDate),
    [partId, type, refType, fromDate, toDate],
  );

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
              <IconActivity size={20} />
            </span>
            Sổ nhật ký kho
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải lịch sử giao dịch kho..."
              : `${transactions.length} giao dịch gần nhất`}
          </p>
        </div>
      </div>

      {/* Bộ lọc */}
      <Card hover={false}>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted uppercase">
            <IconFilter size={13} />
            Bộ lọc
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Phụ tùng
              </label>
              <select
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
                className="w-full h-10 px-2.5 rounded-lg border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Tất cả</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Loại giao dịch
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as InventoryTransactionType | "")
                }
                className="w-full h-10 px-2.5 rounded-lg border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Tất cả</option>
                {TX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TX_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Loại tham chiếu
              </label>
              <select
                value={refType}
                onChange={(e) =>
                  setRefType(
                    e.target.value as InventoryReferenceType | "",
                  )
                }
                className="w-full h-10 px-2.5 rounded-lg border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Tất cả</option>
                {REF_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {REF_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Từ ngày
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Đến ngày
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          {hasFilter && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Xoá bộ lọc
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Bảng */}
      <Card hover={false}>
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Không có giao dịch kho nào khớp bộ lọc."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Thời điểm</th>
                  <th className="font-medium px-4 py-3">Phụ tùng</th>
                  <th className="font-medium px-4 py-3 text-center">Loại</th>
                  <th className="font-medium px-4 py-3 text-center">SL</th>
                  <th className="font-medium px-4 py-3 text-center">
                    Tồn trước → sau
                  </th>
                  <th className="font-medium px-4 py-3">Tham chiếu</th>
                  <th className="font-medium px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const up = isIncrease(tx);
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm line-clamp-1">
                          {tx.partName}
                        </div>
                        <div className="text-xs text-ink-muted">{tx.partSku}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={TX_TYPE_TONE[tx.type]}>
                          {TX_TYPE_LABEL[tx.type] ?? tx.type}
                        </Badge>
                      </td>
                      <td
                        className={[
                          "px-4 py-3 text-center font-semibold",
                          up ? "text-emerald-600" : "text-red-600",
                        ].join(" ")}
                      >
                        {up ? "+" : "-"}
                        {tx.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-ink-muted whitespace-nowrap">
                        {tx.stockBefore} → {tx.stockAfter}
                        {isReservedScope(tx) && (
                          <div
                            className="text-[10px] text-ink-muted/80"
                            title="Với giữ chỗ / giải phóng, số trên là tồn giữ chỗ chứ không phải tồn thực"
                          >
                            (tồn giữ chỗ)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {tx.referenceType ? (
                          <div>
                            <div className="text-ink">
                              {REF_TYPE_LABEL[tx.referenceType] ??
                                tx.referenceType}
                            </div>
                            {tx.referenceId && (
                              <div className="text-ink-muted font-mono text-[10px] break-all">
                                {tx.referenceId}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted max-w-[240px]">
                        <span className="line-clamp-2">{tx.note || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted flex items-center gap-2">
          <IconWarning size={12} />
          Với giao dịch Giữ chỗ / Giải phóng, cột tồn là tồn giữ chỗ; các
          loại khác là tồn thực.
        </div>
      </Card>
    </div>
  );
}
