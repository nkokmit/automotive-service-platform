package com.example.staff_service.dto.response;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public record WorkShiftResponse(
        UUID id,
        String code,
        String name,
        LocalTime startTime,
        LocalTime endTime,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
