package com.example.inventory_service.messaging.event;

import java.util.List;
import java.util.UUID;

public record PartsReservedEvent(
        UUID eventId,
        UUID workOrderId,
        UUID estimateId,
        UUID requestedBy,
        List<PartReservationItem> parts
) {
}
