package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.List;

public record BookingRescheduleContext(Instant currentStartAt, List<ServiceSlot> services) {
    public BookingRescheduleContext {
        services = List.copyOf(services);
    }
}
