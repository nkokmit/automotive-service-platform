package com.example.work_order_service.integration.contract;

import java.util.UUID;

/**
 * Tóm tắt hồ sơ xe cho danh sách quản trị.
 *
 * <p>Chỉ gồm biển số và hãng/dòng — đủ để admin nhận diện xe mà không cần
 * payload đầy đủ của {@link VehicleContract}.
 */
public record VehicleSummaryContract(
        UUID id,
        String licensePlate,
        String make,
        String model,
        Boolean isActive
) {
}
