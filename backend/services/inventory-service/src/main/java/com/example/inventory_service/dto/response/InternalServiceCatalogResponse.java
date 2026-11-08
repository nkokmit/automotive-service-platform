package com.example.inventory_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

/** Dữ liệu catalog cần thiết cho các service nội bộ. */
public record InternalServiceCatalogResponse(
        UUID id,
        String name,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonProperty("required_techs") Integer requiredTechs,
        BigDecimal baseLaborPrice,
        Boolean isActive
) {
}
