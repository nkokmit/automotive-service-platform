package com.example.billing_service.dto.request;

import com.example.billing_service.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentCreateRequest(
        @NotNull UUID invoiceId,
        @NotNull UUID idempotencyKey,
        @NotNull PaymentMethod paymentMethod,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 13, fraction = 2) BigDecimal amount,
        @Size(max = 100) String transactionRef,
        String note
) {
}
