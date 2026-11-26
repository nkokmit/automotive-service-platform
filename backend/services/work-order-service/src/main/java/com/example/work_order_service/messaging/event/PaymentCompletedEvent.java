package com.example.work_order_service.messaging.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentCompletedEvent(
        UUID eventId,
        UUID invoiceId,
        String invoiceCode,
        UUID workOrderId,
        UUID customerId,
        UUID vehicleId,
        BigDecimal paidAmount,
        Instant paidAt
) {
}
