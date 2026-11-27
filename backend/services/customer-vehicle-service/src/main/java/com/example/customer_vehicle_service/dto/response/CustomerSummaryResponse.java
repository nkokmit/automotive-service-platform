package com.example.customer_vehicle_service.dto.response;

import java.util.UUID;

/**
 * Tóm tắt hồ sơ khách hàng cho các service khác gọi theo lô.
 *
 * <p>Chỉ gồm những trường cần để hiển thị danh sách (họ tên, số điện thoại,
 * trạng thái) — không kèm địa chỉ/ghi chú để payload gọn.
 */
public record CustomerSummaryResponse(
        UUID id,
        String fullName,
        String phone,
        Boolean isActive
) {
}
