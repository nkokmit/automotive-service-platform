package com.example.work_order_service.integration.contract;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record InternalServiceQuoteContract(
        UUID serviceId,
        String serviceName,
        String brand,
        String model,
        BigDecimal unitPrice,
        Integer durationMinutes,
        Integer requiredTechs,
        Boolean isActive,
        String pricingSource,
        String bomSource,
        List<InternalServiceQuotePartContract> bomParts
) {
}
