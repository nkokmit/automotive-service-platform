package com.example.booking_service.capacity;

import java.util.UUID;

/**
 * Snapshot một dịch vụ trong chuỗi nối tiếp của booking: thời lượng và số kỹ thuật
 * viên cần đồng thời. Dùng cho cả booking mới (lấy từ Inventory Service) và booking
 * cũ (lấy từ bảng {@code booking_services}).
 */
public record ServiceSlot(
        UUID serviceId,
        String serviceName,
        int durationMinutes,
        int requiredTechnicians
) {
}
