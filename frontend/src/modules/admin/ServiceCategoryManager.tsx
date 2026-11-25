/**
 * ServiceCategoryManager — panel quản lý NHÓM DỊCH VỤ (service categories).
 *
 * Nguồn dữ liệu: inventory-service
 *  - GET    /api/service-categories         → danh sách nhóm
 *  - POST   /api/service-categories         → tạo nhóm
 *  - PUT    /api/service-categories/{id}    → sửa nhóm
 *  - DELETE /api/service-categories/{id}    → xoá nhóm (xoá cứng)
 *
 * Cần authority: `SERVICE_READ` để xem, `SERVICE_WRITE` để thêm/sửa/xoá.
 *
 * Vì sao tách riêng component?
 *  - Nhóm dịch vụ được quản lý ở HAI nơi: trang `/admin/categories` và ngay
 *    trong màn `/admin/services` (tiện khi đang thêm dịch vụ mà chưa có nhóm
 *    phù hợp). Gom logic vào một chỗ để hai nơi hành xử giống hệt nhau.
 *
 * Lưu ý về xoá: backend xoá CỨNG và trả 400 nếu nhóm còn dịch vụ
 * (`ErrorCode.SERVICE_CATEGORY_IN_USE`). Vì vậy component hiển thị sẵn số
 * dịch vụ của từng nhóm và chặn xoá trước khi gọi API.
 */
import { useCallback, useMemo, useState } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconWrench,
  IconArrowDownRight,
  IconArrowUpRight,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { inventoryApi } from "../../api/endpoints/inventory";
import { hasTokenAuthority } from "../../api/session";
import type { CategoryResponse } from "../../api/types";
import ServiceCategoryEditor from "./ServiceCategoryEditor";

export interface ServiceCategoryManagerProps {
  /** Danh sách nhóm đã load sẵn từ parent (để parent đồng bộ dropdown). */
  categories: CategoryResponse[];
  /** Gọi khi danh sách nhóm thay đổi (thêm/sửa/xoá). */
  onChange: (categories: CategoryResponse[]) => void;
  /** Tải lại danh sách nhóm từ server (dùng sau khi xoá/sửa). */
  onReload: () => void | Promise<void>;
  /**
   * Số dịch vụ theo `categoryId` — dùng để cảnh báo "nhóm còn N dịch vụ,
   * không xoá được" và để admin biết nhóm nào đang dùng.
   */
  serviceCountByCategoryId?: Record<string, number>;
  /** Ẩn tiêu đề panel (khi nhúng vào card khác). */
  hideHeader?: boolean;
}

export default function ServiceCategoryManager({
  categories,
  onChange,
  onReload,
  serviceCountByCategoryId = {},
  hideHeader = false,
}: ServiceCategoryManagerProps) {
  const t = useToast();
  const canWrite = hasTokenAuthority("SERVICE_WRITE");

  const [expanded, setExpanded] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((c: CategoryResponse) => {
    setEditing(c);
    setEditorOpen(true);
  }, []);

  const handleSaved = useCallback(
    async (saved: CategoryResponse) => {
      onChange(
        editing
          ? categories.map((c) => (c.id === saved.id ? saved : c))
          : [...categories, saved],
      );
      // Đồng bộ lại từ server để chắc chắn danh sách khớp DB.
      await onReload();
      t.success(
        editing ? "Đã cập nhật nhóm dịch vụ" : "Đã tạo nhóm dịch vụ mới",
      );
    },
    [editing, categories, onChange, onReload, t],
  );

  const handleDelete = useCallback(
    async (c: CategoryResponse) => {
      const count = serviceCountByCategoryId[c.id] ?? 0;
      if (count > 0) {
        t.error(
          `Nhóm "${c.name}" còn ${count} dịch vụ nên không thể xoá. ` +
            `Hãy xoá (ẩn) hết dịch vụ thuộc nhóm này trước.`,
        );
        return;
      }

      setDeletingId(c.id);
      try {
        await inventoryApi.deleteServiceCategory(c.id);
        onChange(categories.filter((x) => x.id !== c.id));
        await onReload();
        t.success(`Đã xoá nhóm "${c.name}"`);
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : `Không xoá được nhóm "${c.name}"`,
        );
      } finally {
        setDeletingId(null);
      }
    },
    [categories, onChange, onReload, serviceCountByCategoryId, t],
  );

  /** Danh sách nhóm + số dịch vụ tương ứng, sắp xếp theo tên. */
  const rows = useMemo(
    () =>
      [...categories]
        .sort((a, b) => a.name.localeCompare(b.name, "vi"))
        .map((c) => ({
          category: c,
          count: serviceCountByCategoryId[c.id] ?? 0,
        })),
    [categories, serviceCountByCategoryId],
  );

  return (
    <div className="rounded-xl border border-ink/8 bg-white overflow-hidden">
      {/* Header có thể thu gọn */}
      {!hideHeader && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bgsoft/50 transition-colors"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <IconWrench size={16} />
            </span>
            Nhóm dịch vụ
            <Badge tone="default">{categories.length}</Badge>
          </span>
          {expanded ? (
            <IconArrowUpRight size={16} className="text-ink-muted" />
          ) : (
            <IconArrowDownRight size={16} className="text-ink-muted" />
          )}
        </button>
      )}

      {expanded && (
        <div className="border-t border-ink/8">
          {/* Danh sách nhóm */}
          {rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">
              Chưa có nhóm dịch vụ nào.
            </div>
          ) : (
            <div className="divide-y divide-ink/5">
              {rows.map(({ category, count }) => (
                <div
                  key={category.id}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-bgsoft/40 transition-colors"
                >
                  <Badge tone="default">{category.code}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink truncate">
                      {category.name}
                    </div>
                    {category.description && (
                      <div className="text-xs text-ink-muted truncate">
                        {category.description}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-ink-muted whitespace-nowrap">
                    {count > 0 ? `${count} dịch vụ` : "Chưa có dịch vụ"}
                  </span>
                  {canWrite && (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                        title="Sửa nhóm"
                      >
                        <IconEdit size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(category)}
                        disabled={deletingId === category.id}
                        className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500 disabled:opacity-50"
                        title={
                          count > 0
                            ? "Không xoá được vì nhóm còn dịch vụ"
                            : "Xoá nhóm"
                        }
                      >
                        <IconTrash size={15} />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Thêm nhóm mới */}
          {canWrite && (
            <div className="px-4 py-3 border-t border-ink/8 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openCreate}>
                <IconPlus size={14} />
                Thêm nhóm dịch vụ
              </Button>
              <span className="text-xs text-ink-muted">
                Nhóm dùng để phân loại dịch vụ trong danh mục.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal tạo / sửa nhóm */}
      {editorOpen && (
        <ServiceCategoryEditor
          editing={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSaved={(saved) => void handleSaved(saved)}
        />
      )}
    </div>
  );
}

/** Hook tiện ích: đếm số dịch vụ theo categoryId. */
export function useServiceCountByCategoryId(
  services: { categoryId: string }[],
): Record<string, number> {
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of services) {
      map[s.categoryId] = (map[s.categoryId] ?? 0) + 1;
    }
    return map;
  }, [services]);
}
