import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconPackage,
  IconWarning,
  IconRefresh,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableFilter,
  type AdminFormProps,
} from "../../components/AdminTable";
import { inventoryApi } from "../../api/endpoints/inventory";
import type { CategoryResponse } from "../../api/types";
import { mapPart, notifyCatalogChanged } from "../../data/catalog";
import type { CatalogPart } from "../../data/catalog";
import {
  formatCompactVND as compactVND,
  getPartDiscountPercent,
} from "../../data/cartStore";

// =========================
// AdminParts — quản lý phụ tùng (kho)
// Nguồn dữ liệu: GET/POST/PUT/DELETE /api/parts (inventory-service)
// Cần authority: PART_READ (xem) / PART_WRITE (ghi) / STOCK_WRITE (điều chỉnh tồn)
// =========================

const columns: AdminTableColumn<CatalogPart>[] = [
  {
    key: "name",
    label: "Phụ tùng",
    render: (p) => (
      <div className="flex items-center gap-3">
        <img
          src={p.image}
          alt={p.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <Link
            to={`/parts/${p.slug}`}
            className="font-semibold text-sm hover:text-primary line-clamp-1"
          >
            {p.name}
          </Link>
          <div className="text-xs text-ink-muted line-clamp-1">
            {p.sku} · {p.brand} · {p.category}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "category",
    label: "Danh mục",
    hideOnMobile: true,
    render: (p) => <Badge tone="default">{p.category}</Badge>,
  },
  {
    key: "price",
    label: "Giá",
    align: "right",
    render: (p) => {
      const discount = getPartDiscountPercent(p);
      return (
        <div className="text-sm">
          <div className="font-semibold text-primary">
            {compactVND(p.priceVND)}
          </div>
          {p.originalPriceVND && discount > 0 && (
            <div className="text-[10px] text-ink-muted line-through">
              {compactVND(p.originalPriceVND)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "stock",
    label: "Tồn kho",
    align: "center",
    render: (p) => {
      const low = p.stockQty < 20;
      return (
        <div
          className={[
            "inline-flex items-center gap-1 text-sm font-semibold",
            low ? "text-amber-700" : "text-ink",
          ].join(" ")}
        >
          {low && <IconWarning size={12} />}
          {p.stockQty}
          <span className="text-[10px] text-ink-muted font-normal">
            {p.unit ? ` ${p.unit}` : ""}
          </span>
        </div>
      );
    },
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (p) => {
      if (p.isActive === false) return <Badge tone="default">Đã ẩn</Badge>;
      if (p.stockQty === 0) return <Badge tone="warning">Hết hàng</Badge>;
      if (p.stockQty < 20) return <Badge tone="warning">Sắp hết</Badge>;
      if (p.isBestSeller) return <Badge tone="primary">Bán chạy</Badge>;
      return <Badge tone="accent">Còn hàng</Badge>;
    },
  },
];

const filters: AdminTableFilter<CatalogPart>[] = [
  { id: "low", label: "Tồn kho thấp", predicate: (p) => p.stockQty < 50 },
  {
    id: "discount",
    label: "Đang giảm giá",
    predicate: (p) => getPartDiscountPercent(p) > 0,
  },
  { id: "bestseller", label: "Bán chạy", predicate: (p) => !!p.isBestSeller },
  { id: "inactive", label: "Đã ẩn", predicate: (p) => p.isActive === false },
];

/**
 * Xem trước mã SKU mà backend sẽ tự sinh từ tên sản phẩm.
 *
 * <p>Backend sinh mã dạng `PT-<SLUG-TÊN>-<4 KÝ TỰ NGẪU NHIÊN>`; phần hậu tố
 * ngẫu nhiên không hiển thị trước được nên ta chỉ preview phần slug.
 */
function previewSku(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 24)
    .replace(/-+$/, "");
  return slug ? `PT-${slug}-••••` : "PT-PHU-TUNG-••••";
}

export default function AdminParts() {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [partRes, catRes] = await Promise.all([
        inventoryApi.listParts({ size: 100, sortBy: "name" }),
        inventoryApi.listPartCategories({ size: 100 }),
      ]);
      setParts((partRes.items ?? []).map(mapPart));
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lowStockCount = parts.filter((p) => p.stockQty < 50).length;

  const form: AdminFormProps<CatalogPart> = useMemo(
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
          readonly: true,
          derive: (values) => {
            const existing = String(values.sku ?? "").trim();
            if (existing) return existing;
            const name = String(values.name ?? "").trim();
            return name ? previewSku(name) : "Nhập tên sản phẩm để tự sinh mã";
          },
          hint: "Hệ thống tự sinh mã từ tên sản phẩm, bạn không cần nhập.",
        },
        {
          key: "brand",
          label: "Thương hiệu",
          type: "text",
          placeholder: "Michelin",
        },
        {
          key: "category",
          label: "Danh mục",
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c.name, label: c.name })),
        },
        {
          key: "unit",
          label: "Đơn vị tính",
          type: "text",
          required: true,
          placeholder: "cái",
        },
        {
          key: "priceVND",
          label: "Giá bán (VNĐ)",
          type: "number",
          required: true,
          placeholder: "500000",
        },
        {
          key: "imageUrl",
          label: "Đường dẫn ảnh",
          type: "text",
          placeholder: "https://cdn.example.com/lop-michelin.jpg",
          hint: "Dán link ảnh (URL). Để trống sẽ dùng ảnh mặc định theo danh mục.",
        },
        {
          key: "description",
          label: "Mô tả sản phẩm",
          type: "textarea",
          rows: 3,
          placeholder: "Mô tả ngắn gọn về phụ tùng, hiển thị ở trang chi tiết.",
        },
        {
          key: "minStockLevel",
          label: "Tồn kho tối thiểu",
          type: "number",
          placeholder: "10",
          hint: "Cảnh báo sắp hết khi tồn thực <= mức này.",
        },
        {
          key: "initialStock",
          label: "Tồn kho ban đầu",
          type: "number",
          modes: ["add"],
          placeholder: "0",
          hint: "Số lượng nhập kho lần đầu. Để 0 nếu chưa có hàng.",
        },
        {
          key: "stockQty",
          label: "Tồn kho hiện tại",
          type: "text",
          readonly: true,
          modes: ["edit"],
          derive: (values) => {
            const current = String(values.stockQty ?? "").trim();
            return current ? `${current}` : "—";
          },
          hint: "Tồn khả dụng hiện tại trong kho.",
        },
        {
          key: "stockMode",
          label: "Cách điều chỉnh tồn",
          type: "select",
          modes: ["edit"],
          options: [
            { value: "ADD", label: "Cộng thêm vào tồn hiện tại" },
            { value: "SET", label: "Đặt tồn thực bằng số lượng này" },
          ],
          hint: "Để trống nếu không muốn thay đổi tồn kho.",
        },
        {
          key: "stockQuantity",
          label: "Số lượng tồn",
          type: "number",
          modes: ["edit"],
          placeholder: "0",
        },
        {
          key: "stockNote",
          label: "Ghi chú tồn kho",
          type: "text",
          modes: ["edit"],
          placeholder: "VD: Nhập bổ sung từ nhà cung cấp",
        },
      ],
      onSubmit: async (values, initial) => {
        const name = String(values.name ?? "").trim();
        if (!name) throw new Error("Vui lòng nhập tên phụ tùng.");

        const categoryName = String(values.category ?? "");
        const categoryId = categories.find((c) => c.name === categoryName)?.id;
        if (!categoryId) {
          throw new Error(
            categoryName
              ? `Không tìm thấy nhóm phụ tùng "${categoryName}".`
              : "Vui lòng chọn nhóm phụ tùng.",
          );
        }

        const unit = String(values.unit ?? "").trim() || "cái";
        const imageUrl = String(values.imageUrl ?? "").trim();
        const description = String(values.description ?? "").trim();

        const payload = {
          categoryId,
          // SKU để trống → backend tự sinh từ tên sản phẩm.
          sku: null,
          name,
          brand: String(values.brand ?? "").trim() || null,
          imageUrl: imageUrl || null,
          description: description || null,
          unit,
          sellingPrice: Number(values.priceVND) || 0,
          minStockLevel:
            values.minStockLevel === undefined || values.minStockLevel === ""
              ? undefined
              : Number(values.minStockLevel),
          isActive: initial?.isActive ?? true,
        };

        const saved = initial
          ? await inventoryApi.updatePart(initial.id, payload)
          : await inventoryApi.createPart({
              ...payload,
              initialStock:
                values.initialStock === undefined || values.initialStock === ""
                  ? 0
                  : Number(values.initialStock),
            });

        // Điều chỉnh tồn kho khi sửa (nếu có yêu cầu) — gọi API kho riêng.
        const stockMode = String(values.stockMode ?? "");
        const stockQuantity = Number(values.stockQuantity ?? 0);
        if (initial && stockMode && stockQuantity > 0) {
          const adjusted = await inventoryApi.adjustPartStock(initial.id, {
            mode: stockMode as "ADD" | "SET",
            quantity: stockQuantity,
            note: String(values.stockNote ?? "").trim() || null,
          });
          notifyCatalogChanged();
          return mapPart(adjusted);
        }

        notifyCatalogChanged();
        return mapPart(saved);
      },
    }),
    [categories],
  );

  const handleDelete = useCallback(async (row: CatalogPart) => {
    // Xoá mềm (isActive = false) → giữ lại lịch sử kho.
    await inventoryApi.deletePart(row.id);
    notifyCatalogChanged();
    return { ...row, isActive: false };
  }, []);

  const handleDuplicate = useCallback(async (row: CatalogPart) => {
    const name = `${row.name} (bản sao)`;
    const saved = await inventoryApi.createPart({
      categoryId: row.categoryId,
      name,
      brand: row.brand || null,
      imageUrl: row.imageUrl || null,
      description: row.description || null,
      unit: row.unit || "cái",
      sellingPrice: row.priceVND,
      minStockLevel: 0,
      isActive: true,
    });
    notifyCatalogChanged();
    return mapPart(saved);
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
        emptyMessage={loading ? "Đang tải..." : "Chưa có phụ tùng nào."}
      />
    </div>
  );
}
