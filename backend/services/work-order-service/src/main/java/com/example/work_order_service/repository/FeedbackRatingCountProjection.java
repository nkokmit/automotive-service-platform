package com.example.work_order_service.repository;

/**
 * Số đánh giá của một mức sao cụ thể (dùng cho biểu đồ phân bố sao).
 */
public interface FeedbackRatingCountProjection {

    Integer getRating();

    Long getRatingCount();
}
