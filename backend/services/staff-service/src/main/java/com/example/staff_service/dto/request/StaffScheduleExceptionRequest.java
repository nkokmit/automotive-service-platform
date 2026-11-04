package com.example.staff_service.dto.request;

import com.example.staff_service.entity.ScheduleExceptionType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record StaffScheduleExceptionRequest(
        @NotNull(message = "ID ca làm việc không được để trống")
        UUID shiftId,

        @NotNull(message = "Ngày ngoại lệ không được để trống")
        LocalDate exceptionDate,

        @NotNull(message = "Loại ngoại lệ không được để trống")
        ScheduleExceptionType exceptionType,

        String reason
) {
}
