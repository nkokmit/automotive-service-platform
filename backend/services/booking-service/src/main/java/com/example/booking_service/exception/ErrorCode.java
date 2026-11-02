package com.example.booking_service.exception;

public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),
    BOOKING_NOT_FOUND(1404, "Không tìm thấy lịch hẹn"),
    SERVICE_NOT_FOUND(1405, "Không tìm thấy dịch vụ"),
    SERVICE_UNAVAILABLE(1406, "Dịch vụ không đang được cung cấp"),
    INSUFFICIENT_TECHNICIAN_CAPACITY(1407, "Không đủ kỹ thuật viên khả dụng"),
    INVALID_BOOKING_TIME(1408, "Thời gian đặt lịch không hợp lệ"),
    INVALID_BOOKING_STATUS_TRANSITION(1409, "Chuyển trạng thái lịch hẹn không hợp lệ"),
    INTEGRATION_SERVICE_UNAVAILABLE(1410, "Dịch vụ tích hợp tạm thời không khả dụng"),

    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ"),
    UNAUTHORIZED(1403, "Bạn không có quyền");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() { return code; }
    public String getMessage() { return message; }
}
