package com.example.staff_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record StaffResponse(
        UUID id,
        UUID userId,
        String employeeCode,
        String fullName,
        String phone,
        String email,
        String position,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
