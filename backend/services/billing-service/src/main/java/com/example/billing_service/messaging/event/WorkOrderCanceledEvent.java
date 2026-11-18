package com.example.billing_service.messaging.event;

import java.time.Instant;
import java.util.UUID;

public record WorkOrderCanceledEvent(
        UUID eventId,
        UUID workOrderId,
        Instant canceledAt,
        String reason
) {
}
