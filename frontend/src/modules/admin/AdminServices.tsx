import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconWrench,
  IconStar,
  IconClock,
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
import { mapService } from "../../data/catalog";
import type { CatalogService } from "../../data/catalog";
import { GARAGE } from "../../config/garage";
import {
  formatCompactVND as compactVND,
} from "../../utils/format";

// =========================
// AdminServices — quản lý dịch vụ
// Nguồn dữ liệu: GET/POST/PUT/DELETE /api/services (inventory-service)
// Cần authority: SERVICE_READ (xem) / SERVICE_WRITE (ghi)
// =========================

const columns: AdminTableColumn<CatalogService>[] = [
  {
    key: "name",
    label: "Dịch vụ",
    render: (s) => (
      <div className="flex items-center gap-3">
        <img
          src={s.image}
          alt={s.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <Link
            to={`/services/${s.slug}`}
            className="font-semibold text-sm hover:text-primary line-clamp-1"
          >
            {s.name}
          </Link>
          <div className="text-xs text-ink-muted line-clamp-1">
            {s.code} · {GARAGE.name}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "category",
    label: "Danh mục",
    hideOnMobile: true,
    render: (s) => <Badge tone="default">{s.category}</Badge>,
  },
  {
    key: "duration",
    label: "Thời lượng",
    align: "center",
    hideOnMobile: true,
    render: (s) => (
      <div className="inline-flex items-center gap-1 text-sm text-ink-muted">
        <IconClock size={12} />~{s.durationMin} phút
      </div>
    ),
  },
  {
    key: "price",
    label: "Giá",
    align: "right",
    render: (s) => (
      <div className="text-sm">
        <div className="font-semibold text-primary">
          {compactVND(s.priceFrom)}
        </div>
        {s.priceTo > s.priceFrom && (
          <div className="text-[10px] text-ink-muted">
            đến {compactVND(s.priceTo)}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (s) =>
      s.isActive === false ? (
        <Badge tone="warning">Đã ẩn</Badge>
      ) : s.isPopular ? (
        <Badge tone="primary">Phổ biến</Badge>
      ) : s.isFeatured ? (
        <Badge tone="accent">Nổi bật</Badge>
      ) : (
        <Badge tone="default">Bình thường</Badge>
      ),
  },
];

const filters: AdminTableFilter<CatalogService>[] = [
  { id: "popular", label: "Phổ biến", predicate: (s) => !!s.isPopular },
  { id: "featured", label: "Nổi bật", predicate: (s) => !!s.isFeatured },
  { id: "inactive", label: "Đã ẩn", predicate: (s) => s.isActive === false },
];

/** Sinh mã dịch vụ từ tên (VD: "Thay dầu động cơ" → "SU-THAY-DAU-DONG-CO"). */
function generateCode(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  return `SV-${slug.slice(0, 25)}`;
}

export default function AdminServices() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcRes, catRes] = await Promise.all([
        inventoryApi.listServices({ size: 100, sortBy: "name" }),
        inventoryApi.listServiceCategories({ size: 100 }),
      ]);
      setServices((svcRes.items ?? []).map(mapService));
      setCategories(catRes.items ?? []);
    } catch (err) {
      setServices([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách dịch vụ từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tìm categoryId theo tên nhóm đã chọn trong form. */
  const resolveCategoryId = (name: string): string | undefined =>
    categories.find((c) => c.name === name)?.id;

  const form: AdminFormProps<CatalogService> = useMemo(
    () => ({
      addTitle: "Thêm dịch vụ mới",
      editTitle: "Chỉnh sửa dịch vụ",
      fields: [
        {
          key: "name",
          label: "Tên dịch vụ",
          type: "text",
          required: true,
          placeholder: "VD: Thay dầu động cơ",
        },
        {
          key: "category",
          label: "Danh mục",
          type: "select",
          required: true,
          options: categories.map((c) => ({ value: c.name, label: c.name })),
        },
        {
          key: "durationMin",
          label: "Thời lượng (phút)",
          type: "number",
          required: true,
          placeholder: "30",
        },
        {
          key: "requiredTechs",
          label: "Số kỹ thuật viên",
          type: "number",
          required: true,
          placeholder: "1",
        },
        {
          key: "priceFrom",
          label: "Giá công (VNĐ)",
          type: "number",
          required: true,
          placeholder: "200000",
        },
        {
          key: "warrantyMonths",
          label: "Bảo hành (tháng)",
          type: "number",
          placeholder: "3",
        },
        {
          key: "description",
          label: "Mô tả",
          type: "textarea",
          rows: 3,
          placeholder: "Mô tả dịch vụ...",
        },
      ],
      onSubmit: async (values, initial) => {
        const name = String(values.name ?? "").trim();
        if (!name) throw new Error("Vui lòng nhập tên dịch vụ.");

        const categoryName = String(values.category ?? "");
        const categoryId = resolveCategoryId(categoryName);
        if (!categoryId) {
          throw new Error(
            categoryName
              ? `Không tìm thấy nhóm dịch vụ "${categoryName}".`
              : "Vui lòng chọn nhóm dịch vụ.",
          );
        }

        const payload = {
          categoryId,
          code: initial?.code || generateCode(name),
          name,
          duration_minutes: Number(values.durationMin) || 30,
          required_techs: Number(values.requiredTechs) || 1,
          baseLaborPrice: Number(values.priceFrom) || 0,
          isActive: initial?.isActive ?? true,
        };

        const saved = initial
          ? await inventoryApi.updateService(initial.id, payload)
          : await inventoryApi.createService(payload);

        // Trả về bản ghi đã lưu → AdminTable dùng nó làm dòng mới / dòng đã
        // sửa (id do server sinh, không phải id tạm ở client).
        return mapService(saved);
      },
    }),
    [categories],
  );

  const handleDelete = useCallback(
    async (row: CatalogService) => {
      // Backend xoá mềm (isActive = false) → trả về bản ghi đã ẩn để bảng
      // hiển thị trạng thái "Đã ẩn" thay vì mất hẳn dòng.
      await inventoryApi.deleteService(row.id);
      return { ...row, isActive: false };
    },
    [],
  );

  const handleDuplicate = useCallback(
    async (row: CatalogService) => {
      const name = `${row.name} (bản sao)`;
      const code = generateCode(name);
      if (code === row.code) {
        throw new Error("Mã dịch vụ trùng với bản ghi gốc.");
      }
      const saved = await inventoryApi.createService({
        categoryId: row.categoryId,
        code,
        name,
        duration_minutes: row.durationMin,
        required_techs: row.requiredTechs,
        baseLaborPrice: row.priceFrom,
        isActive: true,
      });
      return mapService(saved);
    },
    [],
  );

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
        title="Quản lý dịch vụ"
        subtitle={
          loading
            ? "Đang tải danh sách dịch vụ..."
            : `${services.length} dịch vụ đang được cung cấp`
        }
        icon={<IconWrench size={20} />}
        data={services}
        onRowsChange={setServices}
        columns={columns}
        searchKey="name"
        filters={filters}
        addLabel="Thêm dịch vụ"
        form={form}
        onDelete={handleDelete}
        onDuplicate={(row) => void handleDuplicate(row)}
        emptyMessage={loading ? "Đang tải..." : "Chưa có dịch vụ nào."}
      />
    </div>
  );
}
