package com.example.work_order_service.integration.contract;

import java.math.BigDecimal;
import java.util.UUID;

public record InternalServiceQuotePartContract(
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
