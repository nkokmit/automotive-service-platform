package com.example.work_order_service.messaging.event;

import java.util.List;
import java.util.UUID;

public record PartsReservationFailedEvent(
        UUID eventId,
        UUID workOrderId,
        UUID estimateId,
        UUID requestedBy,
        List<PartReservationItem> parts,
        String reason
) {
}
