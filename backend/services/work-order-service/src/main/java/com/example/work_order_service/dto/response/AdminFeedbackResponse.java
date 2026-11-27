package com.example.work_order_service.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Một dòng đánh giá trong danh sách quản trị.
 *
 * <p>Khác với {@link WorkOrderFeedbackResponse} (dùng cho chủ phiếu), bản ghi
 * này bổ sung thông tin nhận diện để admin đọc được: mã phiếu sửa chữa, họ
 * tên khách hàng, biển số xe và các dịch vụ đã hoàn thành.
 */
public record AdminFeedbackResponse(
        UUID id,
        UUID workOrderId,
        String workOrderCode,
        UUID customerId,
        String customerName,
        String customerPhone,
        String licensePlate,
        Integer rating,
        String comment,
        List<String> completedServices,
        Instant createdAt
) {
    public AdminFeedbackResponse {
        completedServices = List.copyOf(completedServices);
    }
}
