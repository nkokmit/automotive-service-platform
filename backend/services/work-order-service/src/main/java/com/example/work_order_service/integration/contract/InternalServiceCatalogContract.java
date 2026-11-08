package com.example.work_order_service.integration.contract;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record InternalServiceCatalogContract(
        UUID id,
        String name,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonProperty("required_techs") Integer requiredTechs,
        BigDecimal baseLaborPrice,
        Boolean isActive
) {
}
