package com.example.news_service.exception;

public class NewsCommentNotFoundException extends ApiException {
    public NewsCommentNotFoundException(String message) {
        super(ErrorCode.NEWS_COMMENT_NOT_FOUND, message);
    }
}
