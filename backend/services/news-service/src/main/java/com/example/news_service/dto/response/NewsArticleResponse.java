package com.example.news_service.dto.response;

import com.example.news_service.enums.NewsArticleStatus;

import java.time.Instant;
import java.util.UUID;

/** Khớp {@code NewsArticleResponse.java}. */
public record NewsArticleResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String categoryCode,
        String slug,
        String title,
        String summary,
        String content,
        String thumbnailUrl,
        String authorName,
        String authorId,
        NewsArticleStatus status,
        Boolean isFeatured,
        Integer viewCount,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
