package com.example.staff_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record RecurringScheduleReplaceRequest(
        @NotNull(message = "Ngày bắt đầu hiệu lực không được để trống")
        LocalDate effectiveFrom,

        LocalDate effectiveTo,

        @NotNull(message = "Danh sách lịch theo tuần không được để trống")
        List<@Valid RecurringScheduleDayRequest> weeklySchedules
) {
}
