package com.example.customer_vehicle_service.dto.response;

import java.util.UUID;

/**
 * Tóm tắt hồ sơ xe cho các service khác gọi theo lô.
 *
 * <p>Chỉ gồm biển số và thông tin cơ bản — đủ để admin nhận diện xe trong
 * danh sách đánh giá mà không cần payload đầy đủ của {@link VehicleResponse}.
 */
public record VehicleSummaryResponse(
        UUID id,
        String licensePlate,
        String make,
        String model,
        Boolean isActive
) {
}
