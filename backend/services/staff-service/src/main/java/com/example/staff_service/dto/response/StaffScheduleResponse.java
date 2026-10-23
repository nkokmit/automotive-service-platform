package com.example.staff_service.dto.response;

import java.util.List;
import java.util.UUID;

public record StaffScheduleResponse(
        UUID staffId,
        String employeeCode,
        String fullName,
        List<ScheduleDayResponse> days
) {
}
