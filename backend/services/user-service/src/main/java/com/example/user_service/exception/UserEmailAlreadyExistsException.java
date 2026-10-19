package com.example.user_service.exception;

public class UserEmailAlreadyExistsException extends ApiException {

    public UserEmailAlreadyExistsException(String message) {
        super(ErrorCode.USER_EMAIL_EXISTS, message);
    }
}
