package com.example.staff_service.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;

public record RecurringScheduleDayRequest(
        @NotNull(message = "Thứ trong tuần không được để trống")
        DayOfWeek dayOfWeek,

        @NotEmpty(message = "Mỗi ngày phải có ít nhất một ca")
        List<@NotNull(message = "ID ca không được để trống") UUID> shiftIds
) {
}
