package com.example.work_order_service.messaging.event;

import java.time.Instant;
import java.util.UUID;

public record WorkOrderCanceledEvent(
        UUID eventId,
        UUID workOrderId,
        Instant canceledAt,
        String reason
) {
}
