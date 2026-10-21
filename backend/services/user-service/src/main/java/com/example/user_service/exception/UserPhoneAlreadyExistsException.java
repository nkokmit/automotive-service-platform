package com.example.user_service.exception;

public class UserPhoneAlreadyExistsException extends ApiException {

    public UserPhoneAlreadyExistsException(String message) {
        super(ErrorCode.USER_PHONE_EXISTS, message);
    }
}
