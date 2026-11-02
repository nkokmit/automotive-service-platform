package com.example.booking_service.integration;

import java.time.Instant;
import java.util.UUID;

public record StaffAvailabilityContract(
        UUID staffId,
        String employeeCode,
        String fullName,
        Instant startAt,
        Instant endAt
) {
}
