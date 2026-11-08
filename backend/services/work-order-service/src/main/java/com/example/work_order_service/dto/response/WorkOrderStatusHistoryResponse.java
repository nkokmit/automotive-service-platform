package com.example.work_order_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record WorkOrderStatusHistoryResponse(
        UUID id,
        String statusFrom,
        String statusTo,
        UUID changedBy,
        String note,
        Instant createdAt
) {
}
