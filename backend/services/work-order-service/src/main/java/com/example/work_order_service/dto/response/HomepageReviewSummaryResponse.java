package com.example.work_order_service.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record HomepageReviewSummaryResponse(
        BigDecimal averageRating,
        long reviewCount,
        List<HomepageReviewResponse> recentReviews
) {
    public HomepageReviewSummaryResponse {
        recentReviews = List.copyOf(recentReviews);
    }
}
