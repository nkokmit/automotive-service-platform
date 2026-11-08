package com.example.inventory_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record InternalServiceBomResponse(
        UUID partId,
        String partSku,
        String partName,
        String partUnit,
        @JsonProperty("default_quantity") Integer defaultQuantity,
        BigDecimal sellingPrice,
        Boolean isActive
) {
}
