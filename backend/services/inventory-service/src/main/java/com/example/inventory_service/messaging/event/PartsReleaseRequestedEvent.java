package com.example.inventory_service.messaging.event;

import java.util.List;
import java.util.UUID;

public record PartsReleaseRequestedEvent(
        UUID eventId,
        UUID workOrderId,
        UUID requestedBy,
        List<PartReservationItem> parts
) {
}
