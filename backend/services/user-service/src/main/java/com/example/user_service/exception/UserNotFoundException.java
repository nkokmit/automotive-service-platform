package com.example.user_service.exception;

public class UserNotFoundException extends ApiException {
    public UserNotFoundException(String message) {
        super(ErrorCode.USER_NOT_FOUND, message);
    }
}
