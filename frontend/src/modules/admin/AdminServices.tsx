import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconWrench,
  IconStar,
  IconClock,
  IconRefresh,
  IconPackage,
  IconPlus,
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
import ServiceCategoryManager, {
  useServiceCountByCategoryId,
  useHiddenServiceCountByCategoryId,
} from "./ServiceCategoryManager";
import ServiceCategoryEditor from "./ServiceCategoryEditor";

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
    key: "bom",
    label: "Định mức",
    align: "center",
    hideOnMobile: true,
    render: (s) => (
      <Link
        to={`/admin/services/bom/${s.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        title="Quản lý định mức phụ tùng (BOM) của dịch vụ này"
      >
        <IconPackage size={12} />
        Phụ tùng
      </Link>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (s) =>
      s.isActive === false ? (
        <Badge tone="warning">Đã ẩn</Badge>
      ) : (
        <Badge tone="default">Bình thường</Badge>
      ),
  },
];

const filters: AdminTableFilter<CatalogService>[] = [
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

  /** Modal tạo nhóm dịch vụ, mở từ nút phụ cạnh dropdown "Danh mục". */
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  /**
   * Nhóm được chọn sẵn khi mở form thêm dịch vụ.
   *
   * <p>Được set khi admin bấm "Thêm dịch vụ" ngay trong danh sách dịch vụ của
   * một nhóm (trong panel quản lý nhóm) → dropdown "Danh mục" hiện sẵn nhóm đó.
   */
  const [prefillCategoryName, setPrefillCategoryName] = useState<string | null>(
    null,
  );
  /**
   * Bộ đếm tín hiệu mở form thêm dịch vụ. Tăng lên mỗi khi admin bấm
   * "Thêm dịch vụ" từ trong danh sách dịch vụ của một nhóm → `AdminTable`
   * tự mở modal thêm với nhóm đã chọn sẵn.
   */
  const [addServiceSignal, setAddServiceSignal] = useState(0);
  /**
   * Callback của `AdminTable` để cập nhật option của dropdown sau khi tạo
   * nhóm mới. Lưu trong ref vì nó được truyền qua `form` (useMemo) và không
   * nên là dependency gây render lại.
   */
  const pendingCategorySync = useRef<
    ((options: { value: string; label: string }[]) => void) | null
  >(null);

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

  /**
   * Tải lại RIÊNG danh sách nhóm dịch vụ.
   *
   * <p>Dùng sau khi thêm/sửa/xoá nhóm trong panel quản lý nhóm: không cần
   * tải lại toàn bộ danh sách dịch vụ (làm chậm và nhảy layout), chỉ đồng bộ
   * dropdown "Danh mục" trong form thêm/sửa dịch vụ.
   */
  const loadCategories = useCallback(async () => {
    try {
      const catRes = await inventoryApi.listServiceCategories({ size: 100 });
      setCategories(catRes.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách nhóm dịch vụ từ máy chủ",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Số dịch vụ của từng nhóm — để cảnh báo khi xoá nhóm còn dịch vụ. */
  const serviceCountByCategoryId = useServiceCountByCategoryId(services);

  /** Số dịch vụ đã ẩn của từng nhóm — để hiển thị "(+N ẩn)". */
  const hiddenServiceCountByCategoryId =
    useHiddenServiceCountByCategoryId(services);

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
          // Nút phụ: tạo nhóm dịch vụ mới ngay tại chỗ, không phải rời trang
          // sang `/admin/categories`. Danh sách option dropdown được cập nhật
          // ngay sau khi tạo xong (không cần đóng/mở lại modal form).
          action: ({ onDone }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Tạo nhóm dịch vụ mới"
              onClick={() => {
                setCategoryEditorOpen(true);
                // Khi modal nhóm đóng lại, đồng bộ option của dropdown.
                pendingCategorySync.current = onDone;
              }}
            >
              <IconPlus size={14} />
              Thêm nhóm
            </Button>
          ),
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
          description: String(values.description ?? "").trim() || null,
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
        description: row.description || null,
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
        // Nhóm được chọn sẵn khi admin bấm "Thêm dịch vụ" từ trong 1 nhóm.
        initialValues={
          prefillCategoryName ? { category: prefillCategoryName } : undefined
        }
        openAddSignal={addServiceSignal}
        form={form}
        onDelete={handleDelete}
        onDuplicate={(row) => void handleDuplicate(row)}
        emptyMessage={loading ? "Đang tải..." : "Chưa có dịch vụ nào."}
      />

      {/* ── Quản lý nhóm dịch vụ (ngay tại màn quản lý dịch vụ) ──────────────
          Nhóm dịch vụ là dữ liệu của backend (bảng `service_categories`).
          Panel này dùng API có sẵn nên không cần chờ backend làm thêm gì.
          Thêm nhóm mới ở đây giúp admin không phải rời trang sang
          `/admin/categories` mỗi khi gặp dịch vụ chưa có nhóm phù hợp. */}
      <ServiceCategoryManager
        categories={categories}
        onChange={setCategories}
        onReload={loadCategories}
        serviceCountByCategoryId={serviceCountByCategoryId}
        hiddenServiceCountByCategoryId={hiddenServiceCountByCategoryId}
        onAddService={(categoryName) => {
          setPrefillCategoryName(categoryName);
          // Tăng tín hiệu → `AdminTable` mở modal thêm dịch vụ với nhóm đã
          // chọn sẵn.
          setAddServiceSignal((n) => n + 1);
        }}
        onServicesChanged={load}
      />

      {/* ── Modal tạo nhóm dịch vụ (mở từ nút phụ cạnh dropdown "Danh mục") ──
          Sau khi tạo xong, danh sách option của dropdown được cập nhật ngay
          để admin chọn được nhóm vừa tạo mà không cần đóng/mở lại form. */}
      {categoryEditorOpen && (
        <ServiceCategoryEditor
          editing={null}
          onClose={() => setCategoryEditorOpen(false)}
          onSaved={(saved) => {
            // Functional update để luôn có danh sách nhóm MỚI NHẤT (state
            // `categories` trong closure có thể đã cũ).
            setCategories((prev) => {
              const next = prev.some((c) => c.id === saved.id)
                ? prev.map((c) => (c.id === saved.id ? saved : c))
                : [...prev, saved];

              // Đồng bộ option của dropdown "Danh mục" trong form thêm/sửa.
              pendingCategorySync.current?.(
                next.map((c) => ({ value: c.name, label: c.name })),
              );
              pendingCategorySync.current = null;

              return next;
            });
          }}
        />
      )}
    </div>
  );
}
