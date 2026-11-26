import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconBuilding,
  IconPhone,
  IconMail,
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
import { hasTokenAuthority } from "../../api/session";
import type { SupplierResponse } from "../../api/types";

// =========================
// AdminSuppliers — quản lý nhà cung cấp
// Nguồn dữ liệu: GET/POST/PUT/DELETE /api/suppliers (inventory-service)
// Cần authority: SUPPLIER_READ (xem) / SUPPLIER_WRITE (ghi)
// =========================

const columns: AdminTableColumn<SupplierResponse>[] = [
  {
    key: "name",
    label: "Nhà cung cấp",
    render: (s) => (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <IconBuilding size={16} />
        </span>
        <div className="min-w-0">
          <span className="font-semibold text-sm line-clamp-1 block">{s.name}</span>
          <div className="text-xs text-ink-muted line-clamp-1">
            {s.code}
            {s.taxCode ? ` · MST ${s.taxCode}` : ""}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "contact",
    label: "Liên hệ",
    hideOnMobile: true,
    render: (s) => (
      <div className="text-xs space-y-0.5">
        <div className="inline-flex items-center gap-1.5 text-ink">
          <IconPhone size={11} />
          {s.phone}
        </div>
        {s.email && (
          <div className="inline-flex items-center gap-1.5 text-ink-muted">
            <IconMail size={11} />
            <span className="line-clamp-1">{s.email}</span>
          </div>
        )}
      </div>
    ),
  },
  {
    key: "address",
    label: "Địa chỉ",
    hideOnMobile: true,
    render: (s) => (
      <span className="text-xs text-ink-muted line-clamp-2">
        {s.address || "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (s) =>
      s.isActive ? (
        <Badge tone="accent">Hoạt động</Badge>
      ) : (
        <Badge tone="default">Đã ẩn</Badge>
      ),
  },
];

const filters: AdminTableFilter<SupplierResponse>[] = [
  { id: "active", label: "Hoạt động", predicate: (s) => s.isActive },
  { id: "inactive", label: "Đã ẩn", predicate: (s) => !s.isActive },
];

/** Sinh mã nhà cung cấp từ tên (VD: "Công ty TNHH ABC" → "NCC-ABC"). */
function generateCode(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  return `NCC-${slug.slice(0, 20) || "MOI"}`;
}

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canWriteSupplier = hasTokenAuthority("SUPPLIER_WRITE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.listSuppliers({ size: 100, sortBy: "name" });
      setSuppliers(res.items ?? []);
    } catch (err) {
      setSuppliers([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách nhà cung cấp từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const form: AdminFormProps<SupplierResponse> = useMemo(
    () => ({
      addTitle: "Thêm nhà cung cấp",
      editTitle: "Chỉnh sửa nhà cung cấp",
      fields: [
        {
          key: "name",
          label: "Tên nhà cung cấp",
          type: "text",
          required: true,
          placeholder: "Công ty TNHH Phụ Tùng XYZ",
        },
        {
          key: "code",
          label: "Mã nhà cung cấp",
          type: "text",
          required: true,
          placeholder: "NCC-XYZ",
          hint: "Mã duy nhất để tra cứu. Để trống hệ thống sẽ gợi ý từ tên.",
        },
        {
          key: "taxCode",
          label: "Mã số thuế",
          type: "text",
          placeholder: "0312345678",
        },
        {
          key: "phone",
          label: "Số điện thoại",
          type: "text",
          required: true,
          placeholder: "0901234567",
        },
        {
          key: "email",
          label: "Email",
          type: "text",
          placeholder: "sales@xyz.vn",
        },
        {
          key: "address",
          label: "Địa chỉ",
          type: "textarea",
          rows: 2,
          placeholder: "Số 1, Đường ABC, Quận 1, TP.HCM",
        },
      ],
      onSubmit: async (values, initial) => {
        const name = String(values.name ?? "").trim();
        if (!name) throw new Error("Vui lòng nhập tên nhà cung cấp.");

        const phone = String(values.phone ?? "").trim();
        if (!phone) throw new Error("Vui lòng nhập số điện thoại.");

        const code = String(values.code ?? "").trim() || generateCode(name);

        const payload = {
          code,
          name,
          taxCode: String(values.taxCode ?? "").trim() || null,
          phone,
          email: String(values.email ?? "").trim() || null,
          address: String(values.address ?? "").trim() || null,
        };

        return initial
          ? await inventoryApi.updateSupplier(initial.id, payload)
          : await inventoryApi.createSupplier(payload);
      },
    }),
    [],
  );

  const handleDelete = useCallback(async (row: SupplierResponse) => {
    await inventoryApi.deleteSupplier(row.id);
    return { ...row, isActive: false };
  }, []);

  const handleDuplicate = useCallback(async (row: SupplierResponse) => {
    const name = `${row.name} (bản sao)`;
    const code = generateCode(name);
    if (code === row.code) {
      throw new Error("Mã nhà cung cấp trùng với bản ghi gốc.");
    }
    return await inventoryApi.createSupplier({
      code,
      name,
      taxCode: row.taxCode,
      phone: row.phone,
      email: row.email,
      address: row.address,
    });
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
        title="Nhà cung cấp"
        subtitle={
          loading
            ? "Đang tải danh sách nhà cung cấp..."
            : `${suppliers.length} nhà cung cấp trong hệ thống`
        }
        icon={<IconBuilding size={20} />}
        data={suppliers}
        onRowsChange={setSuppliers}
        columns={columns}
        searchKey="name"
        filters={filters}
        addLabel="Thêm nhà cung cấp"
        form={form}
        onDelete={handleDelete}
        onDuplicate={(row) => void handleDuplicate(row)}
        readOnly={!canWriteSupplier}
        emptyMessage={
          loading ? "Đang tải..." : "Chưa có nhà cung cấp nào."
        }
      />
    </div>
  );
}
