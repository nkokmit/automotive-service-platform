package com.example.news_service.dto.response;

import java.time.Instant;
import java.util.UUID;

/** Khớp {@code NewsCategoryResponse.java}. */
public record NewsCategoryResponse(
        UUID id,
        String code,
        String name,
        String description,
        Instant createdAt
) {
}
