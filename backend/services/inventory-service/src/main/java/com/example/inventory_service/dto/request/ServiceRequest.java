package com.example.inventory_service.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceRequest(
        @NotNull(message = "Nhóm dịch vụ không được để trống")
        UUID categoryId,

        @NotBlank(message = "Mã dịch vụ không được để trống")
        @Size(max = 30, message = "Mã dịch vụ tối đa 30 ký tự")
        String code,

        @NotBlank(message = "Tên dịch vụ không được để trống")
        @Size(max = 150, message = "Tên dịch vụ tối đa 150 ký tự")
        String name,

        @NotNull(message = "Thời lượng dịch vụ không được để trống")
        @Min(value = 1, message = "Thời lượng dịch vụ phải lớn hơn 0")
        @JsonProperty("duration_minutes")
        @JsonAlias("durationMinutes")
        Integer durationMinutes,

        @NotNull(message = "Số kỹ thuật viên không được để trống")
        @Min(value = 1, message = "Số kỹ thuật viên phải lớn hơn 0")
        @JsonProperty("required_techs")
        @JsonAlias("requiredTechs")
        Integer requiredTechs,

        @NotNull(message = "Giá công không được để trống")
        @DecimalMin(value = "0.00", message = "Giá công không được âm")
        @Digits(integer = 10, fraction = 2, message = "Giá công tối đa 10 chữ số nguyên và 2 chữ số thập phân")
        BigDecimal baseLaborPrice,

        Boolean isActive
) {
}
