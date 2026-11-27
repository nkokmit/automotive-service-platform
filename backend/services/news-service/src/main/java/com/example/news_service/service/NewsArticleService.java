package com.example.news_service.service;

import com.example.news_service.common.PageResponse;
import com.example.news_service.dto.request.NewsArticleRequest;
import com.example.news_service.dto.response.NewsArticleResponse;
import com.example.news_service.enums.NewsArticleStatus;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NewsArticleService {

    /**
     * Danh sách bài viết công khai — chỉ hiển thị bài {@code PUBLISHED}.
     */
    PageResponse<NewsArticleResponse> getPublishedArticles(String keyword,
                                                          UUID categoryId,
                                                          Boolean featured,
                                                          Pageable pageable);

    /**
     * Danh sách bài viết cho quản lý — hiển thị mọi trạng thái.
     */
    PageResponse<NewsArticleResponse> getAllArticles(String keyword,
                                                     UUID categoryId,
                                                     NewsArticleStatus status,
                                                     Pageable pageable);

    /** Bài viết công khai theo slug (chỉ {@code PUBLISHED}). */
    NewsArticleResponse getPublishedArticleBySlug(String slug);

    /** Chi tiết bài viết — dùng trong admin (mọi trạng thái). */
    NewsArticleResponse getArticleById(UUID id);

    /** Bài viết nổi bật đang publish — dùng cho hero ở trang danh sách. */
    PageResponse<NewsArticleResponse> getFeaturedArticles(Pageable pageable);

    /** Bài liên quan — cùng danh mục, đang publish. */
    PageResponse<NewsArticleResponse> getRelatedArticles(UUID categoryId, UUID excludeId, Pageable pageable);

    NewsArticleResponse createArticle(NewsArticleRequest request);

    NewsArticleResponse updateArticle(UUID id, NewsArticleRequest request);

    /** Đăng bài (DRAFT/ARCHIVED → PUBLISHED). */
    NewsArticleResponse publishArticle(UUID id);

    /** Chuyển bài về bản nháp (PUBLISHED → DRAFT). */
    NewsArticleResponse unpublishArticle(UUID id);

    /** Lưu trữ bài viết (PUBLISHED/DRAFT → ARCHIVED). */
    NewsArticleResponse archiveArticle(UUID id);

    void deleteArticle(UUID id);
}
