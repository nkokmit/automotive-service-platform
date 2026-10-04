package com.example.user_service.exception;

public class RoleAlreadyExistsException extends ApiException {
    public RoleAlreadyExistsException(String message) {
        super(ErrorCode.ROLE_ALREADY_EXISTS, message);
    }
}
