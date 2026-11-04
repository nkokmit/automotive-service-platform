package com.example.staff_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record StaffAbsenceRequest(
        @NotNull(message = "Thời điểm bắt đầu nghỉ không được để trống")
        Instant startAt,

        @NotNull(message = "Thời điểm kết thúc nghỉ không được để trống")
        Instant endAt,

        @NotBlank(message = "Loại nghỉ không được để trống")
        @Size(max = 50, message = "Loại nghỉ tối đa 50 ký tự")
        String absenceType,

        String reason
) {
}
