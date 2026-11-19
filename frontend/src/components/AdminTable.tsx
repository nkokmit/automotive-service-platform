import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconFilter,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconClose,
  IconCheck,
  IconMore,
  IconCopy,
} from "./icons";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import { useToast } from "./Toast";

// =========================
// AdminTable — table CRUD dùng chung cho admin pages
// - Tìm kiếm + Filter chips
// - Table với custom cell renderers
// - Row actions: View / Edit / Delete
// - Modal form thêm/sửa
// =========================

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: T) => ReactNode;
  /** Mobile hiển thị như label hay ẩn */
  hideOnMobile?: boolean;
}

export interface AdminTableProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  /** Icon cho header */
  icon: ReactNode;
  data: T[];
  columns: AdminTableColumn<T>[];
  /** Tên trường dùng cho tìm kiếm (VD: "name") */
  searchKey?: keyof T;
  /** Filter chips (nhãn + predicate) */
  filters?: AdminTableFilter<T>[];
  /** Add button label + handler */
  addLabel?: string;
  /** Form modal khi thêm/sửa */
  form: AdminFormProps<T> | null;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  /**
   * Xoá một dòng.
   *
   * - Nếu hàm trả về `void` → dòng bị gỡ khỏi bảng sau khi hàm hoàn tất.
   * - Nếu hàm trả về một dòng (VD: bản ghi đã bị vô hiệu hóa) → dòng đó sẽ
   *   thay thế dòng cũ trong bảng.
   */
  onDelete?: (row: T) => void | T | Promise<void | T>;
  onView?: (row: T) => void;
  /**
   * Nhân bản một dòng.
   *
   * - Nếu hàm trả về `void` → AdminTable tự tạo bản sao cục bộ.
   * - Nếu hàm trả về Promise → AdminTable chờ xong; bản ghi trả về sẽ được
   *   thêm vào bảng (dành cho nhân bản qua API).
   */
  onDuplicate?: (row: T) => void | T | Promise<void | T>;
  /** Empty state message */
  emptyMessage?: string;
  /** Được gọi mỗi khi danh sách rows nội bộ thay đổi (thêm/sửa/xoá). */
  onRowsChange?: (rows: T[]) => void;
}

export interface AdminTableFilter<T> {
  id: string;
  label: string;
  predicate: (row: T) => boolean;
}

export function AdminTable<T extends { id: string }>({
  title,
  subtitle,
  icon,
  data,
  columns,
  searchKey,
  filters = [],
  addLabel = "Thêm mới",
  form,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  emptyMessage = "Không có dữ liệu phù hợp.",
  onRowsChange,
}: AdminTableProps<T>) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeRow, setActiveRow] = useState<T | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [deleteConfirm, setDeleteConfirm] = useState<T | null>(null);
  /** Handler xoá do page cha cung cấp (gọi API). null = xoá nội bộ. */
  const [externalDelete, setExternalDelete] = useState<
    ((row: T) => void | T | Promise<void | T>) | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = useToast();

  // Đọc `?q=` từ URL (ô tìm kiếm trên topbar admin điều hướng tới đây)
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  // Rows nội bộ — cho phép thêm/sửa/xoá thật sự thay vì chỉ toast "mock".
  // Đồng bộ lại khi prop `data` đổi (ví dụ catalog reload từ API).
  const [rows, setRows] = useState<T[]>(data);
  useEffect(() => {
    setRows(data);
  }, [data]);

  /** Cập nhật rows và báo ra ngoài để page cha đồng bộ. */
  const updateRows = (updater: (prev: T[]) => T[]) => {
    setRows((prev) => {
      const next = updater(prev);
      onRowsChange?.(next);
      return next;
    });
  };

  // Filter + search
  const filtered = rows.filter((row) => {
    // Search
    if (search && searchKey) {
      const value = String(row[searchKey] ?? "").toLowerCase();
      if (!value.includes(search.toLowerCase())) return false;
    }
    // Filter
    if (activeFilter !== "all") {
      const f = filters.find((f) => f.id === activeFilter);
      if (f && !f.predicate(row)) return false;
    }
    return true;
  });

  const handleAddClick = () => {
    if (onAdd) {
      onAdd();
      return;
    }
    setFormMode("add");
    setActiveRow(null);
    setShowForm(true);
  };

  const handleEditClick = (row: T) => {
    if (onEdit) {
      onEdit(row);
      return;
    }
    setFormMode("edit");
    setActiveRow(row);
    setShowForm(true);
  };

  const handleDeleteClick = (row: T) => {
    if (onDelete) {
      // Page cha xử lý việc gọi API — hiện modal xác nhận, chờ promise xong.
      setExternalDelete(onDelete);
      setDeleteConfirm(row);
      return;
    }
    setDeleteConfirm(row);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const target = deleteConfirm;
    const label = String(
      (target as Record<string, unknown>)["name"] ?? target.id,
    );
    const handler = externalDelete;

    if (handler) {
      setDeleting(true);
      try {
        const result = await handler(target);
        if (result && typeof result === "object" && "id" in result) {
          // Handler trả về bản ghi đã thay đổi (VD: vô hiệu hóa) → thay thế.
          updateRows((prev) =>
            prev.map((r) => (r.id === target.id ? result : r)),
          );
        } else {
          updateRows((prev) => prev.filter((r) => r.id !== target.id));
        }
        t.success(`Đã xoá "${label}"`);
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : `Không xoá được "${label}"`,
        );
      } finally {
        setDeleting(false);
        setDeleteConfirm(null);
        setExternalDelete(null);
      }
      return;
    }

    updateRows((prev) => prev.filter((r) => r.id !== target.id));
    setDeleteConfirm(null);
    t.success(`Đã xoá "${label}"`);
  };

  /** Nhân bản một dòng (More actions → Nhân bản). */
  const duplicateRow = async (row: T) => {
    const label = String((row as Record<string, unknown>)["name"] ?? row.id);

    if (onDuplicate) {
      setSubmitting(true);
      try {
        const result = await onDuplicate(row);
        if (result && typeof result === "object" && "id" in result) {
          updateRows((prev) => [result, ...prev]);
        }
        t.success(`Đã nhân bản "${label}"`);
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : `Không nhân bản được "${label}"`,
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const clone = {
      ...(row as Record<string, unknown>),
      id: `${row.id}-copy-${Date.now().toString().slice(-6)}`,
      name: `${label} (bản sao)`,
    } as unknown as T;
    updateRows((prev) => [clone, ...prev]);
    t.success(`Đã nhân bản "${label}"`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {icon}
            </span>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-muted mt-1">{subtitle}</p>
          )}
        </div>
        <Button onClick={handleAddClick}>
          <IconPlus size={16} />
          {addLabel}
        </Button>
      </div>

      {/* Search + Filters bar */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={`Tìm ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<IconSearch size={16} />}
            />
          </div>
          {filters.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-ink-muted inline-flex items-center gap-1 px-2">
                <IconFilter size={12} />
                Lọc:
              </span>
              <FilterChip
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
                label="Tất cả"
              />
              {filters.map((f) => (
                <FilterChip
                  key={f.id}
                  active={activeFilter === f.id}
                  onClick={() => setActiveFilter(f.id)}
                  label={f.label}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card hover={false}>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
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
                {filtered.map((row) => (
                  <tr
                    key={row.id}
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
                        {col.render(row)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        onView={onView ? () => onView(row) : undefined}
                        onEdit={() => handleEditClick(row)}
                        onDelete={() => handleDeleteClick(row)}
                        onDuplicate={() => void duplicateRow(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Footer count */}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted flex items-center justify-between">
          <span>
            Hiển thị <strong className="text-ink">{filtered.length}</strong> / {rows.length} bản ghi
          </span>
        </div>
      </Card>

      {/* Add/Edit form modal */}
      {showForm && form && (
        <FormModal
          mode={formMode}
          initial={activeRow}
          title={formMode === "add" ? form.addTitle : form.editTitle}
          onClose={() => setShowForm(false)}
          onSubmit={async (values) => {
            setSubmitting(true);
            try {
              const result = await form.onSubmit(
                values,
                formMode === "edit" ? activeRow : null,
              );

              if (result && typeof result === "object" && "id" in result) {
                if (formMode === "edit" && activeRow) {
                  updateRows((prev) =>
                    prev.map((r) => (r.id === activeRow.id ? result : r)),
                  );
                } else {
                  updateRows((prev) => [result, ...prev]);
                }
              } else if (formMode === "edit" && activeRow) {
                updateRows((prev) =>
                  prev.map((r) =>
                    r.id === activeRow.id
                      ? ({ ...r, ...values } as unknown as T)
                      : r,
                  ),
                );
              } else {
                const newRow = {
                  ...values,
                  id: `new-${Date.now().toString().slice(-8)}`,
                } as unknown as T;
                updateRows((prev) => [newRow, ...prev]);
              }
              setShowForm(false);
              t.success(
                formMode === "add" ? "Đã thêm bản ghi mới" : "Đã cập nhật",
              );
            } catch (err) {
              t.error(
                err instanceof Error
                  ? err.message
                  : "Không lưu được bản ghi. Vui lòng thử lại.",
              );
            } finally {
              setSubmitting(false);
            }
          }}
          submitting={submitting}
          fields={form.fields}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <ConfirmModal
          title="Xác nhận xoá?"
          description={
            <>
              Bạn có chắc muốn xoá{" "}
              <strong>
                "{String((deleteConfirm as Record<string, unknown>)["name"] ?? deleteConfirm.id)}"
              </strong>
              ? Hành động này không thể hoàn tác.
            </>
          }
          confirmLabel="Xoá"
          confirmTone="danger"
          loading={deleting}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-bgsoft text-ink-muted hover:bg-ink/10",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function RowActions({
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="inline-flex items-center gap-1">
      {onView && (
        <button
          onClick={onView}
          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
          title="Xem"
        >
          <IconEye size={15} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
          title="Sửa"
        >
          <IconEdit size={15} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-red-500"
          title="Xoá"
        >
          <IconTrash size={15} />
        </button>
      )}

      {/* More actions dropdown */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
          title="Thao tác khác"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <IconMore size={15} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-ink/10 shadow-cardHover py-1 z-30"
          >
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit?.();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-bgsoft"
            >
              <IconEdit size={14} /> Sửa
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDuplicate?.();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-bgsoft"
            >
              <IconCopy size={14} /> Nhân bản
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onView?.();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-bgsoft"
            >
              <IconEye size={14} /> Xem chi tiết
            </button>
            <div className="h-px bg-ink/8 my-1" />
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete?.();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <IconTrash size={14} /> Xoá
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================
// Form Modal
// =========================

export interface AdminFormField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  rows?: number;
}

export interface AdminFormProps<T> {
  addTitle: string;
  editTitle: string;
  fields: AdminFormField[];
  /**
   * Xử lý lưu.
   *
   * - Trả về `void` → AdminTable tự cập nhật bảng bằng dữ liệu form (optimistic).
   * - Trả về một object có `id` → AdminTable dùng luôn object đó làm dòng mới /
   *   dòng đã cập nhật (dành cho khi dữ liệu lưu qua API, id do server sinh).
   * - Trả về Promise → AdminTable chờ xong mới đóng modal; lỗi sẽ được hiện
   *   bằng toast và modal vẫn mở.
   */
  onSubmit: (
    values: Record<string, string | number>,
    initial: T | null,
  ) => void | T | Promise<void | T>;
}

function FormModal({
  mode,
  initial,
  title,
  fields,
  onClose,
  onSubmit,
  submitting = false,
}: {
  mode: "add" | "edit";
  initial: Record<string, unknown> | null;
  title: string;
  fields: AdminFormField[];
  onClose: () => void;
  onSubmit: (values: Record<string, string | number>) => void | Promise<void>;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const init: Record<string, string | number> = {};
    for (const f of fields) {
      const v = initial?.[f.key];
      init[f.key] = v === undefined || v === null ? "" : String(v);
    }
    return init;
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    void onSubmit(values);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
          <h3 className="font-bold text-base">
            {mode === "add" ? "➕ " : "✏️ "}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  rows={f.rows ?? 3}
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                />
              ) : f.type === "select" ? (
                <select
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">-- Chọn --</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-ink/8 flex gap-2 justify-end sticky bottom-0 bg-white">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting}>
            <IconCheck size={14} />
            {submitting
              ? "Đang lưu..."
              : mode === "add"
                ? "Thêm"
                : "Cập nhật"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// =========================
// Confirm Modal (dùng chung cho delete, deactivate, etc.)
// =========================

export function ConfirmModal({
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  confirmTone = "primary",
  loading = false,
  onClose,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
  /** Đang xử lý → disable nút xác nhận. */
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md p-6"
      >
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-ink-light mb-6">{description}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={confirmTone === "danger" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Suppress unused warning
// (Badge re-exported elsewhere if needed)
