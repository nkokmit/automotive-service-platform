package com.example.work_order_service.integration.contract;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record InternalServiceBomContract(
        UUID partId,
        String partSku,
        String partName,
        String partUnit,
        @JsonProperty("default_quantity") Integer defaultQuantity,
        BigDecimal sellingPrice,
        Boolean isActive
) {
}
