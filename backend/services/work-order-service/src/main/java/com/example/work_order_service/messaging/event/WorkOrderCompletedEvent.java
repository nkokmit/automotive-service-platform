package com.example.work_order_service.messaging.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkOrderCompletedEvent(
        UUID eventId,
        UUID workOrderId,
        UUID customerId,
        UUID vehicleId,
        List<WorkOrderCompletedServiceItem> services,
        List<WorkOrderCompletedPartItem> parts,
        BigDecimal totalAmount,
        Instant occurredAt
) {
}
