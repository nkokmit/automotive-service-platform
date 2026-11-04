package com.example.inventory_service.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * {@code duration_minutes} và {@code required_techs} giữ snake_case để khớp
 * contract mà booking-service đọc.
 */
public record ServiceResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String code,
        String name,
        @JsonProperty("duration_minutes") @JsonAlias("durationMinutes") Integer durationMinutes,
        @JsonProperty("required_techs") @JsonAlias("requiredTechs") Integer requiredTechs,
        BigDecimal baseLaborPrice,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
