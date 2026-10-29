package com.example.inventory_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record PartCompatibilityResponse(
        UUID id,
        UUID partId,
        String vehicleBrand,
        String vehicleModel,
        Short yearFrom,
        Short yearTo,
        Instant createdAt
) {
}
