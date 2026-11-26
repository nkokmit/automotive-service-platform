package com.example.work_order_service.dto.response;

import java.time.Instant;
import java.util.UUID;

public record WorkOrderFeedbackResponse(
        UUID id,
        UUID workOrderId,
        Integer rating,
        String comment,
        Instant createdAt
) {
}
