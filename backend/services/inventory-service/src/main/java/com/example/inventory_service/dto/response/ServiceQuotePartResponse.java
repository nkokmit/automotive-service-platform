package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceQuotePartResponse(
        UUID partId,
        String partSku,
        String partName,
        String partUnit,
        Integer quantity,
        BigDecimal unitPrice,
        Boolean isActive,
        Integer availableStock
) {
}
