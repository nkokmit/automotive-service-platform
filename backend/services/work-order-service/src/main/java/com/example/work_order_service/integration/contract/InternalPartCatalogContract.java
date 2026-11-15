package com.example.work_order_service.integration.contract;

import java.math.BigDecimal;
import java.util.UUID;

public record InternalPartCatalogContract(
        UUID id,
        String sku,
        String name,
        String unit,
        BigDecimal sellingPrice,
        Boolean isActive
) {
}
