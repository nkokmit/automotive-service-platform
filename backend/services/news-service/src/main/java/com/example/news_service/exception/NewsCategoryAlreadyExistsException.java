package com.example.news_service.exception;

public class NewsCategoryAlreadyExistsException extends ApiException {
    public NewsCategoryAlreadyExistsException(String message) {
        super(ErrorCode.NEWS_CATEGORY_ALREADY_EXISTS, message);
    }
}
