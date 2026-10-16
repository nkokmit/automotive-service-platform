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
 * <p>Cố ý chỉ trả {@code customerId} chứ không trả tên khách hàng: quan hệ
 * {@code Vehicle.customer} là {@code LAZY} và {@code open-in-view} đang tắt, nên
 * đọc thêm thuộc tính tên sẽ tạo thêm một cây query cho từng dòng khi phân trang.
 * Trả id khớp với cách {@code CustomerResponse} chỉ trả {@code userId}.
 */
public record VehicleResponse(
        UUID id,
        UUID customerId,
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