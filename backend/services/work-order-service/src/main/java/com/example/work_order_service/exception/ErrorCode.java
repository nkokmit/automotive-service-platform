package com.example.work_order_service.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    INVALID_REQUEST(6000, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    WORK_ORDER_NOT_FOUND(6001, "Không tìm thấy Work Order", HttpStatus.NOT_FOUND),
    BOOKING_NOT_FOUND(6002, "Không tìm thấy lịch hẹn", HttpStatus.NOT_FOUND),
    BOOKING_NOT_CHECKED_IN(6003, "Lịch hẹn chưa được tiếp nhận", HttpStatus.CONFLICT),
    BOOKING_VEHICLE_REQUIRED(6004, "Lịch hẹn chưa được liên kết với xe", HttpStatus.CONFLICT),
    VEHICLE_NOT_FOUND(6005, "Không tìm thấy xe đang hoạt động", HttpStatus.NOT_FOUND),
    INTEGRATION_SERVICE_UNAVAILABLE(6006, "Dịch vụ tích hợp tạm thời không khả dụng", HttpStatus.SERVICE_UNAVAILABLE),
    CUSTOMER_NOT_FOUND(6007, "Không tìm thấy hồ sơ khách hàng", HttpStatus.NOT_FOUND),
    INVALID_WORK_ORDER_STATUS_TRANSITION(6008, "Chuyển trạng thái Work Order không hợp lệ", HttpStatus.CONFLICT),
    ESTIMATE_NOT_FOUND(6009, "Không tìm thấy Estimate", HttpStatus.NOT_FOUND),
    ESTIMATE_NOT_EDITABLE(6010, "Estimate không còn cho phép chỉnh sửa", HttpStatus.CONFLICT),
    SERVICE_NOT_FOUND(6011, "Không tìm thấy dịch vụ", HttpStatus.NOT_FOUND),
    SERVICE_NOT_ACTIVE(6012, "Dịch vụ đã ngừng hoạt động", HttpStatus.CONFLICT),
    BOM_PART_NOT_ACTIVE(6013, "Phụ tùng trong BOM đã ngừng hoạt động", HttpStatus.CONFLICT),
    SERVICE_LINE_NOT_FOUND(6014, "Không tìm thấy dòng dịch vụ trong Estimate", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1403, "Bạn không có quyền", HttpStatus.FORBIDDEN),
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
