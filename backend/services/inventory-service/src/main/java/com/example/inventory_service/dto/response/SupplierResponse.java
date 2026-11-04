package com.example.inventory_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record SupplierResponse(
        UUID id,
        String code,
        String name,
        String taxCode,
        String phone,
        String email,
        String address,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
