package com.example.inventory_service.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record ServiceBomResponse(
        UUID id,
        UUID serviceId,
        UUID partId,
        String partSku,
        String partName,
        String partUnit,
        @JsonProperty("default_quantity") @JsonAlias("defaultQuantity") Integer defaultQuantity,
        String note
) {
}
