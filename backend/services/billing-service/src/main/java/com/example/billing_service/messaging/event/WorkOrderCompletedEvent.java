package com.example.billing_service.messaging.event;

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
    public WorkOrderCompletedEvent {
        services = services == null ? List.of() : List.copyOf(services);
        parts = parts == null ? List.of() : List.copyOf(parts);
    }

    public record WorkOrderCompletedServiceItem(
            UUID serviceLineId,
            UUID serviceId,
            String name,
            BigDecimal unitPrice,
            BigDecimal totalPrice
    ) {
    }

    public record WorkOrderCompletedPartItem(
            UUID workOrderPartId,
            UUID partId,
            String name,
            String sku,
            String unit,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice
    ) {
    }
}
