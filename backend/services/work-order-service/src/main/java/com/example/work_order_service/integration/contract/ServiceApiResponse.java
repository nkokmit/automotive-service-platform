package com.example.work_order_service.integration.contract;

public record ServiceApiResponse<T>(int code, String message, T result) {
}
