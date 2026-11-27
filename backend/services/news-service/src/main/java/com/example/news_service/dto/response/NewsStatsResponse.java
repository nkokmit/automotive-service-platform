package com.example.news_service.dto.response;

/**
 * Tóm tắt số liệu tin tức — dùng cho dashboard admin.
 *
 * <p>Khớp {@code NewsStatsResponse.java}.
 */
public record NewsStatsResponse(
        long totalArticles,
        long publishedArticles,
        long draftArticles,
        long archivedArticles,
        long totalCategories,
        long totalComments
) {
}
