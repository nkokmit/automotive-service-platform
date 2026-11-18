package com.example.billing_service.messaging.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentRefundedEvent(
        UUID eventId,
        UUID paymentId,
        UUID invoiceId,
        UUID workOrderId,
        BigDecimal refundedAmount,
        Instant refundedAt,
        String reason
) {
}
