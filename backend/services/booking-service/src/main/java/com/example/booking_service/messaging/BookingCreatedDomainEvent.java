package com.example.booking_service.messaging;

import java.time.Instant;
import java.util.UUID;

public record BookingCreatedDomainEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        Instant appointmentTime,
        Instant occurredAt
) {
}
