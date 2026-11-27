import { useEffect, useState } from "react";
import { workOrderFeedbackApi } from "../../api/endpoints/workOrder";
import type { HomepageReviewSummaryResponse } from "../../api/types";

/**
 * Tải tổng hợp đánh giá công khai của gara.
 *
 * Nguồn: `GET /api/work-orders/reviews/summary` — endpoint `permitAll()` nên
 * khách chưa đăng nhập vẫn xem được. Backend chặn `limit` ngoài khoảng 1..10.
 *
 * Trả `null` khi lỗi / chưa có đánh giá — caller tự fallback về số liệu tĩnh
 * trong `config/garage.ts`.
 */
export function useHomepageReviewSummary(limit = 5) {
  const [summary, setSummary] = useState<HomepageReviewSummaryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await workOrderFeedbackApi.getHomepageSummary(limit);
        if (!cancelled) setSummary(data);
      } catch {
        // Không chặn render trang chủ nếu endpoint lỗi.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { summary, loading };
}
