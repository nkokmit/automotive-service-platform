package com.example.staff_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record StaffAbsenceResponse(
        UUID absenceId,
        UUID staffId,
        Instant startAt,
        Instant endAt,
        String absenceType,
        String reason,
        UUID recordedBy,
        Instant createdAt
) {
}
