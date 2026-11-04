package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PartCompatibilityRequest(
        @NotBlank(message = "Hãng xe không được để trống")
        @Size(max = 50, message = "Hãng xe tối đa 50 ký tự")
        String vehicleBrand,

        @NotBlank(message = "Dòng xe không được để trống")
        @Size(max = 50, message = "Dòng xe tối đa 50 ký tự")
        String vehicleModel,

        @Min(value = 1900, message = "Năm bắt đầu không hợp lệ")
        @Max(value = 2100, message = "Năm bắt đầu không hợp lệ")
        Short yearFrom,

        @Min(value = 1900, message = "Năm kết thúc không hợp lệ")
        @Max(value = 2100, message = "Năm kết thúc không hợp lệ")
        Short yearTo
) {
}
