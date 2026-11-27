package com.example.news_service.exception;

public class NewsArticleAlreadyExistsException extends ApiException {
    public NewsArticleAlreadyExistsException(String message) {
        super(ErrorCode.NEWS_ARTICLE_ALREADY_EXISTS, message);
    }
}
