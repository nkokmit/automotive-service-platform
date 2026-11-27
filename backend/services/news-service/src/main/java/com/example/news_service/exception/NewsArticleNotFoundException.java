package com.example.news_service.exception;

public class NewsArticleNotFoundException extends ApiException {
    public NewsArticleNotFoundException(String message) {
        super(ErrorCode.NEWS_ARTICLE_NOT_FOUND, message);
    }
}
