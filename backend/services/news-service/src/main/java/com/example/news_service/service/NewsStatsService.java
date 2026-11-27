package com.example.news_service.service;

import com.example.news_service.dto.response.NewsStatsResponse;
import com.example.news_service.enums.NewsArticleStatus;
import com.example.news_service.repository.NewsArticleRepository;
import com.example.news_service.repository.NewsCategoryRepository;
import com.example.news_service.repository.NewsCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NewsStatsService {

    private final NewsArticleRepository newsArticleRepository;
    private final NewsCategoryRepository newsCategoryRepository;
    private final NewsCommentRepository newsCommentRepository;

    /**
     * Số liệu tổng quan về tin tức — dùng cho màn hình dashboard admin.
     */
    public NewsStatsResponse getStats() {
        return new NewsStatsResponse(
                newsArticleRepository.count(),
                newsArticleRepository.countByStatus(NewsArticleStatus.PUBLISHED),
                newsArticleRepository.countByStatus(NewsArticleStatus.DRAFT),
                newsArticleRepository.countByStatus(NewsArticleStatus.ARCHIVED),
                newsCategoryRepository.count(),
                newsCommentRepository.countActive()
        );
    }
}
