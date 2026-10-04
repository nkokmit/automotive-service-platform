package com.example.user_service.exception;

public class RoleNotFoundException extends ApiException {
    public RoleNotFoundException(String message) {
        super(ErrorCode.ROLE_NOT_FOUND, message);
    }
}
