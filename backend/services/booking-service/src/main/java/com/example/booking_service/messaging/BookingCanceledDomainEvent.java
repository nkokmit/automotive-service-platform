package com.example.booking_service.messaging;

import java.time.Instant;
import java.util.UUID;

public record BookingCanceledDomainEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        Instant appointmentTime,
        String reason,
        Instant occurredAt
) {
}
