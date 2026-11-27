package com.example.work_order_service.integration.contract;

import java.util.UUID;

/**
 * Tóm tắt hồ sơ khách hàng cho danh sách quản trị.
 *
 * <p>Khác với {@link CustomerContract}, bản này không cần các trường địa chỉ
 * chi tiết — chỉ đủ để admin nhận diện khách trong danh sách đánh giá.
 */
public record CustomerSummaryContract(
        UUID id,
        String fullName,
        String phone,
        Boolean isActive
) {
}
