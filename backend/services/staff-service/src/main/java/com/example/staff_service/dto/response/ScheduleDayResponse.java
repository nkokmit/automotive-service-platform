package com.example.staff_service.dto.response;

import java.time.LocalDate;
import java.util.List;

public record ScheduleDayResponse(
        LocalDate date,
        List<ScheduleIntervalResponse> intervals
) {
}
