package com.example.booking_service.integration.customer;

import java.time.Instant;
import java.util.UUID;

public record VehicleContract(
        UUID id,
        String licensePlate,
        String vin,
        String make,
        String model,
        Short modelYear,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
