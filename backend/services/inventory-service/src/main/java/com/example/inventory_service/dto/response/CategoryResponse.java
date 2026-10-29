package com.example.inventory_service.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * Dùng chung cho nhóm dịch vụ và nhóm phụ tùng.
 */
public record CategoryResponse(
        UUID id,
        String code,
        String name,
        String description,
        Instant createdAt
) {
}
