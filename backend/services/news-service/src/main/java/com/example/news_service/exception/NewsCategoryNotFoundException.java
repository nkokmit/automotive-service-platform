package com.example.news_service.exception;

public class NewsCategoryNotFoundException extends ApiException {
    public NewsCategoryNotFoundException(String message) {
        super(ErrorCode.NEWS_CATEGORY_NOT_FOUND, message);
    }
}
