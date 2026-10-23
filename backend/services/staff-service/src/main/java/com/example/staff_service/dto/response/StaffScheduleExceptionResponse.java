package com.example.staff_service.dto.response;

import com.example.staff_service.entity.ScheduleExceptionType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StaffScheduleExceptionResponse(
        UUID exceptionId,
        UUID staffId,
        UUID shiftId,
        LocalDate exceptionDate,
        ScheduleExceptionType exceptionType,
        String reason,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt
) {
}
