package com.example.staff_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record StaffAvailabilityResponse(
        UUID staffId,
        String employeeCode,
        String fullName,
        Instant startAt,
        Instant endAt
) {
}
