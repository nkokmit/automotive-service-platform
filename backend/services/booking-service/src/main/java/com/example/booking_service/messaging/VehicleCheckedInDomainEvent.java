package com.example.booking_service.messaging;

import java.time.Instant;
import java.util.UUID;

public record VehicleCheckedInDomainEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        UUID vehicleId,
        UUID advisorId,
        Integer odometerIn,
        String vehicleCondition,
        String customerNote,
        Instant occurredAt
) {
}
