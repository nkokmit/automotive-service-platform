package com.example.work_order_service.messaging.event;

import java.time.Instant;
import java.util.UUID;

public record EstimatePendingApprovalEvent(
        UUID eventId,
        UUID estimateId,
        String estimateCode,
        UUID workOrderId,
        String workOrderCode,
        UUID customerId,
        UUID vehicleId,
        Instant occurredAt
) {
}
