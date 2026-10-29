package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderItemResponse(
        UUID id,
        UUID partId,
        String partSku,
        String partName,
        Integer quantity,
        BigDecimal importPrice,
        BigDecimal totalPrice
) {
}
