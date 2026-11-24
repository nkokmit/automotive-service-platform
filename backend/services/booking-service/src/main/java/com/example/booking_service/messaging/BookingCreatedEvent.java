package com.example.booking_service.messaging;

import java.time.Instant;
import java.util.UUID;

public record BookingCreatedEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        Instant appointmentTime,
        Instant occurredAt
) {
}
