package com.example.billing_service.dto.response;

import com.example.billing_service.enums.PaymentMethod;
import com.example.billing_service.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        String code,
        UUID invoiceId,
        String idempotencyKey,
        PaymentMethod paymentMethod,
        BigDecimal amount,
        PaymentStatus status,
        String transactionRef,
        UUID processedBy,
        String note,
        Instant paidAt,
        Instant refundedAt,
        String refundReason
) {
}
