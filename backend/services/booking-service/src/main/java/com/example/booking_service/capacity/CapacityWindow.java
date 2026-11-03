package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.List;

public record CapacityWindow(
        Instant startAt,
        Instant endAt,
        List<SupplyInterval> supply,
        List<DemandInterval> existingDemand
) {
    public CapacityWindow {
        if (startAt == null || endAt == null || !startAt.isBefore(endAt)) {
            throw new IllegalArgumentException("Capacity window must have startAt < endAt");
        }
        supply = List.copyOf(supply);
        existingDemand = List.copyOf(existingDemand);
    }

    public boolean contains(Instant start, Instant end) {
        return start != null && end != null
                && !start.isBefore(startAt) && !end.isAfter(endAt)
                && start.isBefore(end);
    }
}
