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
import CategoryServiceList from "./CategoryServiceList";

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
  /**
   * Số dịch vụ ĐÃ ẨN theo `categoryId` — chỉ dùng để hiển thị chi tiết
   * "N dịch vụ (+M ẩn)". Không ảnh hưởng quyền xoá (xoá bị chặn khi tổng
   * số dịch vụ > 0).
   */
  hiddenServiceCountByCategoryId?: Record<string, number>;
  /** Ẩn tiêu đề panel (khi nhúng vào card khác). */
  hideHeader?: boolean;
  /**
   * Mở form thêm dịch vụ thuộc một nhóm (truyền tên nhóm để pre-select).
   */
  onAddService?: (categoryName: string) => void;
  /** Gọi sau khi dịch vụ trong nhóm bị thay đổi (để parent đồng bộ bảng). */
  onServicesChanged?: () => void | Promise<void>;
}

export default function ServiceCategoryManager({
  categories,
  onChange,
  onReload,
  serviceCountByCategoryId = {},
  hiddenServiceCountByCategoryId = {},
  hideHeader = false,
  onAddService,
  onServicesChanged,
}: ServiceCategoryManagerProps) {
  const t = useToast();
  const canWrite = hasTokenAuthority("SERVICE_WRITE");

  const [expanded, setExpanded] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /**
   * Nhóm đang mở danh sách dịch vụ. Bấm vào tên nhóm để xem các dịch vụ thuộc
   * nhóm đó; bấm lần nữa để thu gọn.
   */
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

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
        // Nhóm chỉ xoá được khi không còn dịch vụ nào (kể cả đã ẩn) vì FK
        // `fk_services_category` là ON DELETE RESTRICT — dịch vụ đã ẩn vẫn
        // giữ liên kết với nhóm.
        t.error(
          `Nhóm "${c.name}" còn ${count} dịch vụ nên không thể xoá. ` +
            `Dịch vụ đã ẩn vẫn giữ liên kết với nhóm — hãy xoá dịch vụ ` +
            `trong nhóm này trước.`,
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

  /**
   * Danh sách nhóm + số dịch vụ tương ứng, sắp xếp theo tên.
   *
   * <p>Tách `activeCount` (đang hiển thị cho khách) và `hiddenCount` (đã ẩn)
   * để admin thấy rõ nhóm nào còn dịch vụ "thật" và nhóm nào chỉ còn dịch vụ
   * đã ẩn (nhóm này vẫn chưa xoá được vì FK ON DELETE RESTRICT).
   */
  const rows = useMemo(
    () =>
      [...categories]
        .sort((a, b) => a.name.localeCompare(b.name, "vi"))
        .map((c) => {
          const all = serviceCountByCategoryId[c.id] ?? 0;
          const hidden = hiddenServiceCountByCategoryId[c.id] ?? 0;
          return {
            category: c,
            count: all,
            activeCount: all - hidden,
            hiddenCount: hidden,
          };
        }),
    [categories, serviceCountByCategoryId, hiddenServiceCountByCategoryId],
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
              {rows.map(({ category, count, activeCount, hiddenCount }) => {
                const isOpen = openCategoryId === category.id;
                return (
                  <div key={category.id}>
                    <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-bgsoft/40 transition-colors">
                      <Badge tone="default">{category.code}</Badge>

                      {/* Bấm vào tên nhóm → xem / ẩn danh sách dịch vụ thuộc nhóm */}
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCategoryId(isOpen ? null : category.id)
                        }
                        className="min-w-0 flex-1 text-left"
                        title={
                          isOpen
                            ? "Ẩn danh sách dịch vụ của nhóm"
                            : "Xem danh sách dịch vụ thuộc nhóm này"
                        }
                        aria-expanded={isOpen}
                      >
                        <div className="text-sm font-medium text-ink truncate hover:text-primary transition-colors">
                          {category.name}
                        </div>
                        {category.description && (
                          <div className="text-xs text-ink-muted truncate">
                            {category.description}
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenCategoryId(isOpen ? null : category.id)
                        }
                        className="text-xs text-ink-muted whitespace-nowrap hover:text-primary transition-colors"
                        title={
                          activeCount > 0
                            ? `${activeCount} dịch vụ đang hoạt động` +
                              (hiddenCount > 0 ? `, ${hiddenCount} đã ẩn` : "")
                            : "Chưa có dịch vụ"
                        }
                      >
                        {count > 0
                          ? `${activeCount} dịch vụ` +
                            (hiddenCount > 0 ? ` (+${hiddenCount} ẩn)` : "")
                          : "Chưa có dịch vụ"}
                      </button>

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
                                ? `Không xoá được vì nhóm còn ${count} dịch vụ (kể cả dịch vụ đã ẩn)`
                                : "Xoá nhóm"
                            }
                          >
                            <IconTrash size={15} />
                          </button>
                        </span>
                      )}
                    </div>

                    {/* Danh sách dịch vụ của nhóm */}
                    {isOpen && (
                      <div className="px-4 pb-3 pl-6 bg-bgsoft/30">
                        <CategoryServiceList
                          categoryId={category.id}
                          categoryName={category.name}
                          onClose={() => setOpenCategoryId(null)}
                          onChanged={onServicesChanged}
                          onAddService={onAddService}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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

/**
 * Hook tiện ích: đếm số dịch vụ theo `categoryId` (TẤT CẢ, kể cả đã ẩn).
 *
 * <p>Khớp với backend: nhóm chỉ xoá được khi KHÔNG còn dịch vụ nào thuộc nhóm
 * — kể cả dịch vụ đã ẩn. Lý do: dịch vụ bị "xoá" đi thực tế là soft-delete,
 * dòng vẫn còn trong bảng `services` và FK `fk_services_category` là
 * `ON DELETE RESTRICT` nên MySQL chặn xoá nhóm.
 */
export function useServiceCountByCategoryId(
  services: { categoryId: string; isActive?: boolean }[],
): Record<string, number> {
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of services) {
      map[s.categoryId] = (map[s.categoryId] ?? 0) + 1;
    }
    return map;
  }, [services]);
}

/**
 * Hook tiện ích: đếm số dịch vụ ĐÃ ẨN theo `categoryId`.
 *
 * <p>Dùng để hiển thị chi tiết "N dịch vụ (+M ẩn)" cho admin — giúp phân biệt
 * nhóm còn dịch vụ đang hiển thị với nhóm chỉ còn dịch vụ đã ẩn.
 */
export function useHiddenServiceCountByCategoryId(
  services: { categoryId: string; isActive?: boolean }[],
): Record<string, number> {
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of services) {
      if (s.isActive !== false) continue;
      map[s.categoryId] = (map[s.categoryId] ?? 0) + 1;
    }
    return map;
  }, [services]);
}
