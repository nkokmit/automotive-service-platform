package com.example.billing_service.messaging.event;

import java.time.Instant;
import java.util.UUID;

public record InvoiceVoidedEvent(
        UUID eventId,
        UUID invoiceId,
        UUID workOrderId,
        Instant voidedAt,
        String reason
) {
}
