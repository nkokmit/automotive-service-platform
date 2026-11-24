package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * {@code availableStock = onHandStock - reservedStock}.
 */
public record PartResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String sku,
        String oemCode,
        String name,
        String brand,
        String unit,
        BigDecimal costPrice,
        BigDecimal sellingPrice,
        Integer onHandStock,
        Integer reservedStock,
        Integer availableStock,
        Integer minStockLevel,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
