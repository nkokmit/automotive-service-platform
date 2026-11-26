package com.example.work_order_service.dto.response;

import java.util.List;

public record FeedbackEligiblePageResponse(
        List<FeedbackEligibleWorkOrderResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public FeedbackEligiblePageResponse {
        items = List.copyOf(items);
    }
}
