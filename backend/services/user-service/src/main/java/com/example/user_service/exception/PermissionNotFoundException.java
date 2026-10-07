package com.example.user_service.exception;

public class PermissionNotFoundException extends ApiException {
    public PermissionNotFoundException(String message) {
        super(ErrorCode.PERMISSION_NOT_FOUND, message);
    }
}
