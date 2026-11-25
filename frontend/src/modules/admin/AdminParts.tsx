/**
 * AdminParts — quản lý phụ tùng (catalog + tồn kho).
 *
 * Nguồn dữ liệu (inventory-service):
 *  - GET    /api/parts              → tìm kiếm / lọc / phân trang
 *  - GET    /api/parts/{id}         → chi tiết
 *  - POST   /api/parts              → tạo mới
 *  - PUT    /api/parts/{id}         → cập nhật
 *  - DELETE /api/parts/{id}         → vô hiệu hoá (soft delete)
 *  - GET    /api/part-categories    → nhóm phụ tùng
 *
 * Cần authority: PART_READ (xem) / PART_WRITE (ghi).
 *
 * Lưu ý về tồn kho: backend tách 3 loại tồn —
 *  - `onHandStock`   tồn thực trong kho
 *  - `reservedStock` tồn đang giữ chỗ cho phiếu sửa chữa
 *  - `availableStock` = onHand − reserved (số lượng bán được)
 *
 * Tồn kho KHÔNG sửa trực tiếp qua API này — backend ghi rõ "Không đổi tồn kho
 * qua API này". Tồn chỉ thay đổi qua đơn nhập hàng (nhập kho) và các thao tác
 * kho của Work Order. Vì vậy form sửa chỉ cho phép chỉnh mức tồn tối thiểu.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconPackage,
  IconWarning,
  IconRefresh,
  IconSearch,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableFilter,
  type AdminFormProps,
} from "../../components/AdminTable";
import { inventoryApi } from "../../api/endpoints/inventory";
import { hasTokenAuthority } from "../../api/session";
import type { CategoryResponse, PartResponse } from "../../api/types";
import { notifyCatalogChanged } from "../../data/catalog";
import { formatFullVND } from "../../utils/format";

// =========================
// AdminParts — quản lý phụ tùng (kho)
// =========================

/**
 * Sắp hết: tồn thực <= mức tồn tối thiểu.
 *
 * <p>Khớp đúng công thức của backend (`PartRepository.search`):
 * `lowStockOnly` → `p.onHandStock <= p.minStockLevel`. Dùng `availableStock` ở đây
 * sẽ lệch với kết quả server trả về khi lọc `?lowStockOnly=true`.
 */
function isLowStock(p: PartResponse): boolean {
  const min = p.minStockLevel ?? 0;
  return (p.onHandStock ?? 0) <= min;
}

/**
 * Hết hàng: không còn tồn khả dụng để bán.
 *
 * <p>Khác với `isLowStock` — ở đây tính theo tồn **khả dụng**
 * (`onHand − reserved`), vì phần đang giữ chỗ cho phiếu sửa chữa không bán
 * được nữa.
 */
function isOutOfStock(p: PartResponse): boolean {
  return (p.availableStock ?? 0) <= 0;
}

const columns: AdminTableColumn<PartResponse>[] = [
  {
    key: "name",
    label: "Phụ tùng",
    render: (p) => (
      <div className="min-w-0">
        <span className="font-semibold text-sm line-clamp-1 block">{p.name}</span>
        <div className="text-xs text-ink-muted line-clamp-1">
          {p.sku}
          {p.oemCode ? ` · OEM ${p.oemCode}` : ""}
          {p.brand ? ` · ${p.brand}` : ""}
        </div>
      </div>
    ),
  },
  {
    key: "category",
    label: "Danh mục",
    hideOnMobile: true,
    render: (p) => <Badge tone="default">{p.categoryName}</Badge>,
  },
  {
    key: "price",
    label: "Giá bán",
    align: "right",
    render: (p) => (
      <div className="text-sm">
        <div className="font-semibold text-primary">
          {formatFullVND(Number(p.sellingPrice ?? 0))}
        </div>
        {Number(p.costPrice ?? 0) > 0 && (
          <div className="text-[10px] text-ink-muted">
            vốn {formatFullVND(Number(p.costPrice))}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "stock",
    label: "Tồn kho",
    align: "center",
    render: (p) => {
      const low = isLowStock(p);
      const available = p.availableStock ?? 0;
      return (
        <div
          className={[
            "inline-flex items-center gap-1 text-sm font-semibold",
            low ? "text-amber-700" : "text-ink",
          ].join(" ")}
        >
          {low && <IconWarning size={12} />}
          {available}
          <span className="text-[10px] text-ink-muted font-normal">
            {p.unit ? ` ${p.unit}` : ""}
          </span>
          {(p.reservedStock ?? 0) > 0 && (
            <span
              className="text-[10px] font-normal text-ink-muted"
              title="Tồn đang giữ chỗ cho phiếu sửa chữa"
            >
              (giữ {p.reservedStock})
            </span>
          )}
        </div>
      );
    },
  },
  {
    key: "minStock",
    label: "Tồn tối thiểu",
    align: "center",
    hideOnMobile: true,
    render: (p) => (
      <span className="text-xs text-ink-muted">{p.minStockLevel ?? 0}</span>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (p) => {
      if (p.isActive === false) return <Badge tone="default">Đã ẩn</Badge>;
      if (isOutOfStock(p)) return <Badge tone="warning">Hết hàng</Badge>;
      if (isLowStock(p)) return <Badge tone="warning">Sắp hết</Badge>;
      return <Badge tone="accent">Còn hàng</Badge>;
    },
  },
];

const filters: AdminTableFilter<PartResponse>[] = [
  { id: "low", label: "Sắp hết hàng", predicate: isLowStock },
  { id: "out", label: "Hết hàng", predicate: isOutOfStock },
  {
    id: "reserved",
    label: "Đang giữ chỗ",
    predicate: (p) => (p.reservedStock ?? 0) > 0,
  },
  { id: "inactive", label: "Đã ẩn", predicate: (p) => p.isActive === false },
];

/**
 * Sinh SKU gợi ý từ tên sản phẩm (VD: "Lốp Michelin 205/55R16" →
 * "SP-LOP-MICHELIN-205-55R16").
 */
function generateSku(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `SP-${slug.toUpperCase()}` : "SP-PHU-TUNG";
}

export default function AdminParts() {
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Ô tìm kiếm (chưa áp dụng). */
  const [keywordInput, setKeywordInput] = useState("");
  /** Từ khoá đã áp dụng lên backend (`keyword` của `/api/parts`). */
  const [keyword, setKeyword] = useState("");
  /**
   * Chỉ xem phụ tùng sắp hết hàng — lọc ở **server** qua `?lowStockOnly=true`
   * (backend: `onHandStock <= minStockLevel`).
   */
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const canWrite = hasTokenAuthority("PART_WRITE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [partRes, catRes] = await Promise.all([
        inventoryApi.listParts({
          size: 100,
          sortBy: "name",
          keyword: keyword.trim() || undefined,
          lowStockOnly: lowStockOnly || undefined,
        }),
        inventoryApi.listPartCategories({ size: 100 }),
      ]);
      setParts(partRes.items ?? []);
      setCategories(catRes.items ?? []);
    } catch (err) {
      setParts([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách phụ tùng từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, lowStockOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const lowStockCount = parts.filter(isLowStock).length;

  const form: AdminFormProps<PartResponse> = useMemo(
    () => ({
      addTitle: "Thêm phụ tùng mới",
      editTitle: "Chỉnh sửa phụ tùng",
      fields: [
        {
          key: "name",
          label: "Tên sản phẩm",
          type: "text",
          required: true,
          placeholder: "VD: Lốp Michelin 205/55R16",
        },
        {
          key: "sku",
          label: "Mã SKU",
          type: "text",
          required: true,
          placeholder: "SP-LOP-MICHELIN-205-55R16",
          hint: "Mã kho duy nhất để tra cứu. Để trống hệ thống sẽ gợi ý từ tên.",
        },
        {
          key: "brand",
          label: "Thương hiệu",
          type: "text",
          placeholder: "Michelin",
        },
        {
          key: "oemCode",
          label: "Mã OEM",
          type: "text",
          placeholder: "56211",
          hint: "Mã linh kiện gốc của nhà sản xuất (tuỳ chọn).",
        },
        {
          key: "categoryId",
          label: "Nhóm phụ tùng",
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
        {
          key: "unit",
          label: "Đơn vị tính",
          type: "text",
          required: true,
          placeholder: "cái",
        },
        {
          key: "sellingPrice",
          label: "Giá bán (VNĐ)",
          type: "number",
          required: true,
          placeholder: "500000",
        },
        {
          key: "minStockLevel",
          label: "Tồn kho tối thiểu",
          type: "number",
          placeholder: "10",
          hint: "Cảnh báo sắp hết khi tồn khả dụng <= mức này.",
        },
      ],
      onSubmit: async (values, initial) => {
        const name = String(values.name ?? "").trim();
        if (!name) throw new Error("Vui lòng nhập tên phụ tùng.");

        const categoryId = String(values.categoryId ?? "");
        if (!categoryId) {
          throw new Error("Vui lòng chọn nhóm phụ tùng.");
        }

        const unit = String(values.unit ?? "").trim() || "cái";
        const oemCode = String(values.oemCode ?? "").trim();

        const payload = {
          categoryId,
          sku: String(values.sku ?? "").trim() || generateSku(name),
          oemCode: oemCode || null,
          name,
          brand: String(values.brand ?? "").trim() || null,
          unit,
          sellingPrice: Number(values.sellingPrice) || 0,
          minStockLevel:
            values.minStockLevel === undefined || values.minStockLevel === ""
              ? undefined
              : Number(values.minStockLevel),
          isActive: initial?.isActive ?? true,
        };

        const saved = initial
          ? await inventoryApi.updatePart(initial.id, payload)
          : await inventoryApi.createPart(payload);

        notifyCatalogChanged();
        return saved;
      },
    }),
    [categories],
  );

  const handleDelete = useCallback(async (row: PartResponse) => {
    // Xoá mềm (isActive = false) → giữ lại lịch sử kho.
    await inventoryApi.deletePart(row.id);
    notifyCatalogChanged();
    return { ...row, isActive: false };
  }, []);

  const handleDuplicate = useCallback(async (row: PartResponse) => {
    const name = `${row.name} (bản sao)`;
    const sku = generateSku(name);
    if (sku === row.sku) {
      throw new Error("SKU trùng với bản ghi gốc.");
    }
    const saved = await inventoryApi.createPart({
      categoryId: row.categoryId,
      sku,
      name,
      brand: row.brand,
      unit: row.unit || "cái",
      sellingPrice: Number(row.sellingPrice ?? 0),
      minStockLevel: 0,
      isActive: true,
    });
    notifyCatalogChanged();
    return saved;
  }, []);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

      {/* Ô tìm kiếm gửi lên backend `keyword` */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Tìm phụ tùng theo tên, SKU, mã OEM..."
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
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={[
              "text-xs font-medium px-2.5 py-1 rounded-full transition-colors whitespace-nowrap",
              lowStockOnly
                ? "bg-primary text-white"
                : "bg-bgsoft text-ink-muted hover:bg-ink/10",
            ].join(" ")}
            title="Chỉ hiện phụ tùng sắp hết hàng (lọc ở server)"
          >
            Sắp hết hàng
          </button>
        </div>
      </Card>

      <AdminTable
        title="Quản lý phụ tùng"
        subtitle={
          loading
            ? "Đang tải danh sách phụ tùng..."
            : `${parts.length} sản phẩm trong kho${
                lowStockCount > 0 ? ` · ${lowStockCount} sắp hết hàng` : ""
              }`
        }
        icon={<IconPackage size={20} />}
        data={parts}
        onRowsChange={setParts}
        columns={columns}
        searchKey="name"
        filters={filters}
        addLabel="Thêm phụ tùng"
        form={form}
        onDelete={handleDelete}
        onDuplicate={(row) => void handleDuplicate(row)}
        readOnly={!canWrite}
        emptyMessage={loading ? "Đang tải..." : "Chưa có phụ tùng nào."}
      />
    </div>
  );
}
