package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderItemRequest(
        @NotNull(message = "Phụ tùng không được để trống")
        UUID partId,

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        Integer quantity,

        @NotNull(message = "Giá nhập không được để trống")
        @DecimalMin(value = "0.00", message = "Giá nhập không được âm")
        @Digits(integer = 10, fraction = 2, message = "Giá nhập tối đa 10 chữ số nguyên và 2 chữ số thập phân")
        BigDecimal importPrice
) {
}
