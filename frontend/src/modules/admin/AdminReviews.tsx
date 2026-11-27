/**
 * AdminReviews — quản lý đánh giá sửa chữa của khách hàng.
 *
 * Nguồn dữ liệu (work-order-service):
 *  - GET    /api/admin/work-order-feedbacks          → danh sách đánh giá có phân trang
 *  - DELETE /api/admin/work-order-feedbacks/{id}     → xoá đánh giá
 *
 * Cần authority:
 *  - `WORK_ORDER_FEEDBACK_READ`   → xem danh sách (bắt buộc để vào trang)
 *  - `WORK_ORDER_FEEDBACK_DELETE` → xoá đánh giá
 *
 * Lưu ý: điểm trung bình và phân bố sao luôn tính trên TOÀN BỘ đánh giá,
 * không phụ thuộc bộ lọc/trang đang xem — admin cần bức tranh toàn cửa hàng.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconStar,
  IconRefresh,
  IconTrash,
  IconClose,
  IconChart,
  IconCheckCircle,
  IconClock,
  IconChat,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { ConfirmModal } from "../../components/AdminTable";
import { adminWorkOrderFeedbackApi } from "../../api/endpoints/workOrder";
import { hasTokenAuthority } from "../../api/session";
import type { AdminFeedbackResponse } from "../../api/types";

/** Số bản ghi mỗi trang. */
const PAGE_SIZE = 20;

/** Mức sao cao nhất — dùng để ánh xạ mức sao sang index của `ratingCounts`. */
const MAX_RATING = 5;

/** Nhãn mức sao cho bộ lọc. */
const RATING_FILTERS: { value: number | null; label: string }[] = [
  { value: null, label: "Tất cả" },
  { value: 5, label: "5 sao" },
  { value: 4, label: "4 sao" },
  { value: 3, label: "3 sao" },
  { value: 2, label: "2 sao" },
  { value: 1, label: "1 sao" },
];

export default function AdminReviews() {
  const t = useToast();

  const [items, setItems] = useState<AdminFeedbackResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<number[]>([0, 0, 0, 0, 0]);

  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Đánh giá đang chờ xác nhận xoá. */
  const [pendingDelete, setPendingDelete] = useState<AdminFeedbackResponse | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const canDelete = hasTokenAuthority("WORK_ORDER_FEEDBACK_DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminWorkOrderFeedbackApi.list({
        rating: ratingFilter ?? undefined,
        page,
        size: PAGE_SIZE,
      });
      setItems(result.items ?? []);
      setTotalPages(result.totalPages ?? 0);
      setTotalElements(result.totalElements ?? 0);
      setAverageRating(result.averageRating ?? 0);
      setRatingCounts(
        result.ratingCounts?.length === 5
          ? result.ratingCounts
          : [0, 0, 0, 0, 0],
      );
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách đánh giá từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Đổi bộ lọc → quay về trang đầu. */
  const changeFilter = useCallback((next: number | null) => {
    setRatingFilter(next);
    setPage(0);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminWorkOrderFeedbackApi.delete(pendingDelete.id);
      setItems((prev) => prev.filter((x) => x.id !== pendingDelete.id));
      setTotalElements((prev) => Math.max(0, prev - 1));

      // Cập nhật luôn phân bố sao và điểm trung bình — nếu chỉ giảm
      // totalElements thì thẻ thống kê sẽ hiện số cũ, mâu thuẫn với header.
      setRatingCounts((prev) => {
        const next = [...prev];
        const index = MAX_RATING - pendingDelete.rating; // 5 sao -> index 0
        if (index >= 0 && index < next.length) {
          next[index] = Math.max(0, next[index] - 1);
        }
        // Tính lại điểm trung bình từ phân bố mới để hai thẻ thống kê luôn khớp.
        const total = next.reduce((sum, count) => sum + count, 0);
        const weighted = next.reduce(
          (sum, count, i) => sum + count * (MAX_RATING - i),
          0,
        );
        setAverageRating(
          total === 0 ? 0 : Math.round((weighted / total) * 100) / 100,
        );
        return next;
      });

      t.success("Đã xoá đánh giá");
      setPendingDelete(null);
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không xoá được đánh giá",
      );
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, t]);

  /** Tổng số đánh giá theo tất cả các mức sao. */
  const totalReviews = useMemo(
    () => ratingCounts.reduce((sum, count) => sum + count, 0),
    [ratingCounts],
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
              <IconStar size={20} />
            </span>
            Đánh giá sửa chữa
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải..."
              : `${totalElements} đánh giá · điểm trung bình ${averageRating.toFixed(2)}/5`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Điểm trung bình */}
        <div className="bg-white border border-ink/8 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <IconStar size={22} className="text-ink" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-ink-muted">Điểm trung bình</div>
            <div className="text-2xl font-bold">
              {averageRating.toFixed(2)}
              <span className="text-sm font-normal text-ink-muted"> / 5</span>
            </div>
            <div className="text-xs text-ink-muted">
              {totalReviews} đánh giá tổng cộng
            </div>
          </div>
        </div>

        {/* Phân bố theo mức sao */}
        <div className="bg-white border border-ink/8 rounded-2xl p-4 lg:col-span-2">
          <div className="text-xs text-ink-muted mb-3 flex items-center gap-1.5">
            <IconChart size={13} />
            Phân bố theo mức sao
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star, index) => {
              const count = ratingCounts[index] ?? 0;
              const percent =
                totalReviews === 0 ? 0 : Math.round((count / totalReviews) * 100);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => changeFilter(star)}
                  className={[
                    "w-full flex items-center gap-2 text-xs rounded-lg px-1.5 py-1 transition-colors",
                    ratingFilter === star ? "bg-primary/10" : "hover:bg-bgsoft",
                  ].join(" ")}
                >
                  <span className="w-8 text-left text-ink-muted shrink-0">
                    {star} sao
                  </span>
                  <span className="flex-1 h-2 rounded-full bg-bgsoft overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-accent-hover"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="w-20 text-right text-ink-muted shrink-0">
                    {count} ({percent}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-muted">Lọc theo mức sao:</span>
          {RATING_FILTERS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => changeFilter(option.value)}
              className={[
                "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
                ratingFilter === option.value
                  ? "bg-primary text-white"
                  : "bg-bgsoft text-ink-muted hover:bg-ink/10",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
          {ratingFilter !== null && (
            <button
              type="button"
              onClick={() => changeFilter(null)}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <IconClose size={12} />
              Bỏ lọc
            </button>
          )}
        </div>
      </Card>

      {/* Danh sách đánh giá */}
      <Card hover={false}>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading
              ? "Đang tải..."
              : ratingFilter !== null
                ? `Không có đánh giá ${ratingFilter} sao.`
                : "Chưa có đánh giá nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Khách hàng</th>
                  <th className="font-medium px-4 py-3">Phiếu sửa chữa</th>
                  <th className="font-medium px-4 py-3">Đánh giá</th>
                  <th className="font-medium px-4 py-3">Nhận xét</th>
                  <th className="font-medium px-4 py-3">Ngày</th>
                  {canDelete && (
                    <th className="font-medium px-4 py-3 text-right">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                  >
                    {/* Khách hàng */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">
                        {item.customerName ?? "Không rõ"}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {item.licensePlate ?? "—"}
                        {item.customerPhone ? ` · ${item.customerPhone}` : ""}
                      </div>
                    </td>

                    {/* Phiếu sửa chữa */}
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium">{item.workOrderCode}</div>
                      {item.completedServices.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {item.completedServices.slice(0, 3).map((service) => (
                            <Badge key={service} tone="default">
                              {service}
                            </Badge>
                          ))}
                          {item.completedServices.length > 3 && (
                            <span className="text-[11px] text-ink-muted">
                              +{item.completedServices.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Đánh giá */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <IconStar
                          size={15}
                          className="text-accent-hover"
                        />
                        <span className="font-semibold">{item.rating}</span>
                        <span className="text-xs text-ink-muted">/ 5</span>
                      </div>
                    </td>

                    {/* Nhận xét */}
                    <td className="px-4 py-3 max-w-md">
                      {item.comment ? (
                        <p
                          className="text-sm text-ink-light whitespace-pre-wrap line-clamp-3"
                          title={item.comment}
                        >
                          {item.comment}
                        </p>
                      ) : (
                        <span className="text-xs text-ink-muted">
                          Không có nhận xét
                        </span>
                      )}
                    </td>

                    {/* Ngày */}
                    <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <IconClock size={11} />
                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="mt-0.5">
                        {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Hành động */}
                    {canDelete && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setPendingDelete(item)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                          title="Xoá đánh giá"
                        >
                          <IconTrash size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted flex items-center justify-between flex-wrap gap-2">
          <span>
            Trang <strong className="text-ink">{page + 1}</strong> /{" "}
            <strong className="text-ink">{Math.max(totalPages, 1)}</strong> ·{" "}
            {totalElements} đánh giá
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages || loading}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal xác nhận xoá */}
      {pendingDelete && (
        <ConfirmModal
          title="Xác nhận xoá đánh giá?"
          description={
            <>
              Xoá đánh giá{" "}
              <strong>
                {pendingDelete.rating} sao
                {pendingDelete.customerName ? ` của ${pendingDelete.customerName}` : ""}
              </strong>
              ? Khách hàng sẽ được đánh giá lại phiếu sửa chữa này. Hành động này
              không thể hoàn tác.
            </>
          }
          confirmLabel="Xoá"
          confirmTone="danger"
          loading={deleting}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {/* Gợi ý khi người dùng thiếu quyền xoá */}
      {!canDelete && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconCheckCircle size={12} />
          Bạn chỉ có quyền xem — cần authority WORK_ORDER_FEEDBACK_DELETE để
          xoá đánh giá.
        </p>
      )}
    </div>
  );
}
