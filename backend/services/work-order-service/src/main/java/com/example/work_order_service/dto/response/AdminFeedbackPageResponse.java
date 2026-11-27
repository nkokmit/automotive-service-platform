package com.example.work_order_service.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Trang danh sách đánh giá cho màn hình quản trị.
 *
 * <p>Kèm luôn thống kê tổng quan để admin không phải gọi thêm API khác:
 * điểm trung bình, tổng số đánh giá và phân bố theo từng mức sao.
 */
public record AdminFeedbackPageResponse(
        List<AdminFeedbackResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        BigDecimal averageRating,
        List<Integer> ratingCounts
) {
    public AdminFeedbackPageResponse {
        items = List.copyOf(items);
        ratingCounts = List.copyOf(ratingCounts);
    }
}
