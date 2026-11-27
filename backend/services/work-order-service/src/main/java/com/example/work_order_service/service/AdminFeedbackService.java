package com.example.work_order_service.service;

import com.example.work_order_service.dto.response.AdminFeedbackPageResponse;
import com.example.work_order_service.dto.response.AdminFeedbackResponse;

import java.util.UUID;

/**
 * Nghiệp vụ đánh giá dành cho màn hình quản trị.
 *
 * <p>Tách khỏi {@link WorkOrderFeedbackService} vì hai bên khác nhau cả về
 * quyền truy cập lẫn nhu cầu dữ liệu: chủ phiếu chỉ xem được đánh giá của
 * chính mình, còn admin xem được toàn bộ kèm thông tin nhận diện khách.
 */
public interface AdminFeedbackService {

    /**
     * Danh sách đánh giá có phân trang, kèm thống kê tổng quan.
     *
     * @param rating lọc theo mức sao cụ thể; {@code null} thì không lọc.
     */
    AdminFeedbackPageResponse list(Integer rating, int page, int size);

    /**
     * Xoá một đánh giá (VD: nhận xét vi phạm).
     *
     * @return {@code true} nếu xoá thành công, {@code false} nếu không tồn tại.
     */
    boolean delete(UUID feedbackId);
}
