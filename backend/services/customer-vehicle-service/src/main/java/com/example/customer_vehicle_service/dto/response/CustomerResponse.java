package com.example.customer_vehicle_service.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO trả về cho API khách hàng.
 *
 * <p>Cố ý không kèm {@code deletedAt}: các truy vấn thông thường đã loại bỏ
 * khách hàng đã xoá mềm nhờ {@code @SQLRestriction} ở entity {@code Customer},
 * nên client không cần biết trạng thái xoá mềm.
 */
public record CustomerResponse(
        UUID id,
        UUID userId,
        String fullName,
        String phone,
        String email,
        String address,
        String notes,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}