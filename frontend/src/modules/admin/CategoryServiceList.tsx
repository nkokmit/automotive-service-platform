/**
 * CategoryServiceList — hiển thị danh sách dịch vụ thuộc một nhóm dịch vụ.
 *
 * Mở ra khi admin bấm vào một nhóm trong panel quản lý nhóm
 * (`ServiceCategoryManager`). Mục đích: admin thấy ngay nhóm đang chứa
 * dịch vụ nào để thêm / xoá / đổi nhóm mà không phải lọc bảng dịch vụ bên
 * trên (mất thời gian tìm trong danh sách dài).
 *
 * API: GET /api/service-categories/{id}/services (inventory-service),
 * cần authority `SERVICE_READ`.
 */
import { useCallback, useEffect, useState } from "react";
import {
  IconRefresh,
  IconTrash,
  IconPackage,
  IconArrowUpRight,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { inventoryApi } from "../../api/endpoints/inventory";
import { hasTokenAuthority } from "../../api/session";
import type { ServiceResponse } from "../../api/types";
import { formatCompactVND as compactVND } from "../../utils/format";

export interface CategoryServiceListProps {
  /** Id của nhóm dịch vụ cần xem. */
  categoryId: string;
  /** Tên nhóm — hiển thị trên tiêu đề. */
  categoryName: string;
  /** Đóng danh sách (quay lại danh sách nhóm). */
  onClose: () => void;
  /**
   * Gọi sau khi có thay đổi dịch vụ trong nhóm (thêm / xoá / đổi nhóm) để
   * parent đồng bộ lại bảng dịch vụ và số đếm của các nhóm.
   */
  onChanged?: () => void | Promise<void>;
  /** Mở form thêm dịch vụ thuộc nhóm này. */
  onAddService?: (categoryName: string) => void;
}

export default function CategoryServiceList({
  categoryId,
  categoryName,
  onClose,
  onChanged,
  onAddService,
}: CategoryServiceListProps) {
  const t = useToast();
  const canWrite = hasTokenAuthority("SERVICE_WRITE");

  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await inventoryApi.listServicesByCategory(categoryId);
      setServices(items ?? []);
    } catch (err) {
      setServices([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách dịch vụ của nhóm",
      );
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Ẩn (xoá mềm) một dịch vụ trong nhóm. */
  const handleDelete = useCallback(
    async (service: ServiceResponse) => {
      setDeletingId(service.id);
      try {
        await inventoryApi.deleteService(service.id);
        // Backend xoá mềm → dịch vụ chuyển `isActive = false`, vẫn còn trong
        // nhóm nhưng không hiển thị cho khách. Ta đánh dấu ngay trong UI.
        setServices((prev) =>
          prev.map((s) =>
            s.id === service.id ? { ...s, isActive: false } : s,
          ),
        );
        await onChanged?.();
        t.success(`Đã ẩn dịch vụ "${service.name}"`);
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : `Không xoá được dịch vụ "${service.name}"`,
        );
      } finally {
        setDeletingId(null);
      }
    },
    [onChanged, t],
  );

  const activeCount = services.filter((s) => s.isActive !== false).length;
  const hiddenCount = services.length - activeCount;

  return (
    <div className="rounded-xl border border-ink/8 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink/8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconPackage size={16} />
            </span>
            <span className="truncate">{categoryName}</span>
          </div>
          <p className="text-xs text-ink-muted mt-1 ml-10">
            {loading
              ? "Đang tải..."
              : `${activeCount} dịch vụ đang hoạt động` +
                (hiddenCount > 0 ? ` · ${hiddenCount} đã ẩn` : "")}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 shrink-0">
          {canWrite && onAddService && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddService(categoryName)}
              title="Thêm dịch vụ vào nhóm này"
            >
              Thêm dịch vụ
            </Button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
            title="Tải lại"
          >
            <IconRefresh size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
            title="Quay lại danh sách nhóm"
          >
            <IconArrowUpRight size={15} />
          </button>
        </div>
      </div>

      {/* Danh sách */}
      {error ? (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      ) : services.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-muted">
          {loading ? "Đang tải..." : "Nhóm này chưa có dịch vụ nào."}
        </div>
      ) : (
        <div className="divide-y divide-ink/5 max-h-[420px] overflow-y-auto">
          {services.map((s) => {
            const isHidden = s.isActive === false;
            return (
              <div
                key={s.id}
                className="px-4 py-2.5 flex items-center gap-3 hover:bg-bgsoft/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={[
                      "text-sm font-medium truncate",
                      isHidden ? "text-ink-muted line-through" : "text-ink",
                    ].join(" ")}
                  >
                    {s.name}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {s.code} · {s.duration_minutes ?? 0} phút ·{" "}
                    {compactVND(s.baseLaborPrice ?? 0)}
                  </div>
                </div>
                {isHidden ? (
                  <Badge tone="warning">Đã ẩn</Badge>
                ) : (
                  <Badge tone="default">Đang hoạt động</Badge>
                )}
                {canWrite && !isHidden && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(s)}
                    disabled={deletingId === s.id}
                    className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500 disabled:opacity-50"
                    title="Ẩn dịch vụ này (xoá mềm)"
                  >
                    <IconTrash size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
