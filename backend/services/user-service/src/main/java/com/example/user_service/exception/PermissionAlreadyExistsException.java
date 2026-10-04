package com.example.user_service.exception;

public class PermissionAlreadyExistsException extends ApiException {
    public PermissionAlreadyExistsException(String message) {
        super(ErrorCode.PERMISSION_ALREADY_EXISTS, message);
    }
}
