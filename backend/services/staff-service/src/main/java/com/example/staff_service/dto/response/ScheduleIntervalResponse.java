package com.example.staff_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ScheduleIntervalResponse(
        UUID shiftId,
        String shiftCode,
        String shiftName,
        Instant startAt,
        Instant endAt
) {
}
