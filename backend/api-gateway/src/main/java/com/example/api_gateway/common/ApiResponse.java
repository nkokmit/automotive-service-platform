package com.example.api_gateway.common;

import com.example.api_gateway.exception.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Response format chuẩn cho toàn bộ API của gateway.
 *
 * <p>Giữ đúng contract với các microservice khác (GLOBAL_RULES §15):
 *
 * <pre>
 * {
 *   "code": 1000,
 *   "message": "Success",
 *   "result": { ... }
 * }
 * </pre>
 *
 * <p>Gateway chỉ dùng {@link #error(ErrorCode)} và {@link #error(ErrorCode, String)}
 * cho các lỗi phát sinh tại gateway (auth, routing). Response thành công không đi
 * qua gateway mà do service phía sau tự trả về theo contract riêng của service đó.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(int code, String message, T result) {

    public static <T> ApiResponse<T> success(T result) {
        return new ApiResponse<>(0, "Success", result);
    }

    public static <T> ApiResponse<T> success(String message, T result) {
        return new ApiResponse<>(0, message, result);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return new ApiResponse<>(errorCode.getCode(), errorCode.getMessage(), null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message) {
        return new ApiResponse<>(errorCode.getCode(), message, null);
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}