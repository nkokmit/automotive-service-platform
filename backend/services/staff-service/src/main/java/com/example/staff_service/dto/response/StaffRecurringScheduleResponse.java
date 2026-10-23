package com.example.staff_service.dto.response;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.UUID;

public record StaffRecurringScheduleResponse(
        UUID scheduleId,
        UUID shiftId,
        DayOfWeek dayOfWeek,
        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {
}
