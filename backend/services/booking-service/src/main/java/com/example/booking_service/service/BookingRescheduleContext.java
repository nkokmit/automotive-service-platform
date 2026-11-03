package com.example.booking_service.service;

import com.example.booking_service.capacity.ServiceSlot;

import java.time.Instant;
import java.util.List;

public record BookingRescheduleContext(Instant currentStartAt, List<ServiceSlot> services) {
    public BookingRescheduleContext {
        services = List.copyOf(services);
    }
}
