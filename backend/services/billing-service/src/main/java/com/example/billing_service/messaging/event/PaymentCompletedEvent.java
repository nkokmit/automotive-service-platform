package com.example.billing_service.messaging.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentCompletedEvent(
        UUID eventId,
        UUID invoiceId,
        UUID workOrderId,
        BigDecimal paidAmount,
        Instant paidAt
) {
}
