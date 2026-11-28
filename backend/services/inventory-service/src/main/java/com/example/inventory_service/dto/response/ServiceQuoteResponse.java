package com.example.inventory_service.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ServiceQuoteResponse(
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
        List<ServiceQuotePartResponse> bomParts
) {
}
