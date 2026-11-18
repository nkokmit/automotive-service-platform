package com.example.billing_service.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1403, "Bạn không có quyền", HttpStatus.FORBIDDEN),
    INVALID_REQUEST(7100, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    INVOICE_NOT_FOUND(7101, "Không tìm thấy hóa đơn", HttpStatus.NOT_FOUND),
    WORK_ORDER_NOT_BILLABLE(7102, "Work Order chưa đủ điều kiện lập hóa đơn", HttpStatus.CONFLICT),
    INVOICE_NOT_EDITABLE(7103, "Hóa đơn không thể chỉnh sửa", HttpStatus.CONFLICT),
    INVALID_DISCOUNT(7104, "Mức giảm giá không hợp lệ", HttpStatus.BAD_REQUEST),
    WORK_ORDER_NOT_FOUND(7105, "Không tìm thấy Work Order hoặc Estimate", HttpStatus.NOT_FOUND),
    WORK_ORDER_SERVICE_UNAVAILABLE(
            7106, "Work Order service hiện không khả dụng", HttpStatus.SERVICE_UNAVAILABLE),
    PAYMENT_NOT_FOUND(7201, "Không tìm thấy giao dịch thanh toán", HttpStatus.NOT_FOUND),
    PAYMENT_NOT_REFUNDABLE(7202, "Giao dịch thanh toán không thể hoàn tiền", HttpStatus.CONFLICT),
    PAYMENT_EXCEEDS_BALANCE(7203, "Số tiền thanh toán vượt quá số dư hóa đơn", HttpStatus.CONFLICT),
    INVALID_PAYMENT_AMOUNT(7204, "Số tiền thanh toán phải lớn hơn 0", HttpStatus.BAD_REQUEST),
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
