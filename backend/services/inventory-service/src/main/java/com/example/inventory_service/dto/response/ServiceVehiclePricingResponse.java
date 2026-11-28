package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ServiceVehiclePricingResponse(
        UUID id,
        UUID serviceId,
        String brand,
        String model,
        BigDecimal unitPrice,
        Integer durationMinutes,
        Instant createdAt,
        Instant updatedAt
) {
}
