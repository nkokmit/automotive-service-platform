package com.example.customer_vehicle_service.messaging.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkOrderCompletedEvent(
        UUID eventId,
        UUID workOrderId,
        String workOrderCode,
        UUID customerId,
        UUID vehicleId,
        List<WorkOrderCompletedServiceItem> services,
        List<WorkOrderCompletedPartItem> parts,
        BigDecimal totalAmount,
        Instant occurredAt
) {
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
