package com.example.notification_service.integration.contract;

public record ServiceApiResponse<T>(int code, String message, T result) {
}
