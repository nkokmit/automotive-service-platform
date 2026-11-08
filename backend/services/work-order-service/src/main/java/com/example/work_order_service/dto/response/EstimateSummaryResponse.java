package com.example.work_order_service.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record EstimateSummaryResponse(
        UUID id,
        String code,
        String type,
        String status,
        BigDecimal totalAmount
) {
}
