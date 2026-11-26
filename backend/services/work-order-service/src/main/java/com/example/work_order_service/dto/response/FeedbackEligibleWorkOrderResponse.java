package com.example.work_order_service.dto.response;

import java.util.UUID;

public record FeedbackEligibleWorkOrderResponse(
        UUID workOrderId,
        String workOrderCode
) {
}
