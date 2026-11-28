package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ServiceVehiclePricingRequest(
        @Size(max = 100, message = "Hãng xe tối đa 100 ký tự")
        String brand,

        @Size(max = 100, message = "Dòng xe tối đa 100 ký tự")
        String model,

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.00", message = "Đơn giá không được âm")
        @Digits(integer = 10, fraction = 2, message = "Đơn giá tối đa 10 chữ số nguyên và 2 chữ số thập phân")
        BigDecimal unitPrice,

        @NotNull(message = "Thời lượng không được để trống")
        @Min(value = 0, message = "Thời lượng không được âm")
        Integer durationMinutes
) {
}
