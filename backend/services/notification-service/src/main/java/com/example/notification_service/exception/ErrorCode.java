package com.example.notification_service.exception;

public enum ErrorCode {

    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    NOTIFICATION_NOT_FOUND(8404, "Không tìm thấy thông báo"),
    NOTIFICATION_TEMPLATE_NOT_FOUND(8405, "Không tìm thấy mẫu thông báo"),

    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ"),
    UNAUTHORIZED(1403, "Bạn không có quyền");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
