package com.example.inventory_service.messaging.event;

import java.util.UUID;

public record PartReservationItem(
        UUID workOrderPartId,
        UUID catalogPartId,
        Integer quantity
) {
}
