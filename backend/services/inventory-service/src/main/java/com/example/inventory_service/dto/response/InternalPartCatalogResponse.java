package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record InternalPartCatalogResponse(
        UUID id,
        String sku,
        String name,
        String unit,
        BigDecimal sellingPrice,
        Boolean isActive
) {
}
