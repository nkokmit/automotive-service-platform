package com.example.customer_vehicle_service.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO trả về cho API xe (PLAN.md bước 4).
 *
 * <p>Cố ý không kèm {@code deletedAt}: các truy vấn thông thường đã loại bỏ xe đã
 * xoá mềm nhờ {@code @SQLRestriction} ở entity {@code Vehicle}, nên client không
 * cần biết trạng thái xoá mềm.
 *
 * <p>Cố ý KHÔNG có {@code customerId}: hồ sơ xe không còn gắn với khách hàng
 * nào ({@code V3__decouple_customer_from_vehicle.sql}). Muốn biết ai từng mang
 * xe này đến thì tra {@code GET /api/vehicles/{id}/service-history} và đọc
 * {@code customerId} của từng bản ghi.
 */
public record VehicleResponse(
        UUID id,
        String licensePlate,
        String vin,
        String make,
        String model,
        Short modelYear,
        String trim,
        String color,
        String fuelType,
        String transmission,
        Integer odometerKm,
        String notes,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}