package com.example.billing_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DiscountUpdateRequest(
        @NotNull @DecimalMin(value = "0.00") @Digits(integer = 13, fraction = 2) BigDecimal discountAmount,
        String note
) {
}
