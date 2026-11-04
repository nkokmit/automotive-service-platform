package com.example.staff_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record WorkShiftCreateRequest(
        @NotBlank(message = "Mã ca không được để trống")
        @Size(max = 50, message = "Mã ca tối đa 50 ký tự")
        String code,

        @NotBlank(message = "Tên ca không được để trống")
        @Size(max = 100, message = "Tên ca tối đa 100 ký tự")
        String name,

        @NotNull(message = "Giờ bắt đầu không được để trống")
        LocalTime startTime,

        @NotNull(message = "Giờ kết thúc không được để trống")
        LocalTime endTime,

        Boolean isActive
) {
}
