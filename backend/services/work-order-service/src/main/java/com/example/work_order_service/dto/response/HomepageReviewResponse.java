package com.example.work_order_service.dto.response;

import java.time.Instant;
import java.util.List;

public record HomepageReviewResponse(
        Integer rating,
        String comment,
        Instant createdAt,
        List<String> completedServices
) {
    public HomepageReviewResponse {
        completedServices = List.copyOf(completedServices);
    }
}
