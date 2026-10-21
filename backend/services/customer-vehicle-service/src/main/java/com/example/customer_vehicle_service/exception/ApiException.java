package com.example.customer_vehicle_service.exception;

import lombok.Getter;

/**
 * Exception cơ sở cho toàn bộ business exception trong service.
 * Mang theo {@link ErrorCode} để centralized handler trả response đúng format.
 */
@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}