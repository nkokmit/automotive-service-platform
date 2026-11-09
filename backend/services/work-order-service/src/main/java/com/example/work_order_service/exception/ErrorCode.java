package com.example.work_order_service.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    // Work Order và yêu cầu chung (60xx)
    INVALID_REQUEST(6000, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    WORK_ORDER_NOT_FOUND(6001, "Không tìm thấy Work Order", HttpStatus.NOT_FOUND),
    INVALID_WORK_ORDER_STATUS_TRANSITION(6002, "Chuyển trạng thái Work Order không hợp lệ", HttpStatus.CONFLICT),

    // Estimate và các dòng báo giá (61xx)
    ESTIMATE_NOT_FOUND(6101, "Không tìm thấy Estimate", HttpStatus.NOT_FOUND),
    ESTIMATE_NOT_EDITABLE(6102, "Estimate không còn cho phép chỉnh sửa", HttpStatus.CONFLICT),
    SERVICE_LINE_NOT_FOUND(6103, "Không tìm thấy dòng dịch vụ trong Estimate", HttpStatus.NOT_FOUND),
    PART_LINE_NOT_FOUND(6104, "Không tìm thấy dòng phụ tùng trong Estimate", HttpStatus.NOT_FOUND),
    ESTIMATE_ITEM_DECISION_CONFLICT(6105, "Không thể thay đổi quyết định của hạng mục", HttpStatus.CONFLICT),
    INVALID_SERVICE_LINE_STATUS_TRANSITION(6106, "Chuyển trạng thái dòng dịch vụ không hợp lệ",
            HttpStatus.CONFLICT),
    STAFF_PROFILE_NOT_FOUND(6107, "Không tìm thấy hồ sơ nhân viên", HttpStatus.NOT_FOUND),
    STAFF_PROFILE_INACTIVE(6108, "Hồ sơ nhân viên không hoạt động", HttpStatus.CONFLICT),

    // Booking (62xx)
    BOOKING_NOT_FOUND(6201, "Không tìm thấy lịch hẹn", HttpStatus.NOT_FOUND),
    BOOKING_NOT_CHECKED_IN(6202, "Lịch hẹn chưa được tiếp nhận", HttpStatus.CONFLICT),
    BOOKING_VEHICLE_REQUIRED(6203, "Lịch hẹn chưa được liên kết với xe", HttpStatus.CONFLICT),

    // Khách hàng và xe (63xx)
    CUSTOMER_NOT_FOUND(6301, "Không tìm thấy hồ sơ khách hàng", HttpStatus.NOT_FOUND),
    VEHICLE_NOT_FOUND(6302, "Không tìm thấy xe đang hoạt động", HttpStatus.NOT_FOUND),

    // Catalog dịch vụ và phụ tùng (64xx)
    SERVICE_NOT_FOUND(6401, "Không tìm thấy dịch vụ", HttpStatus.NOT_FOUND),
    SERVICE_NOT_ACTIVE(6402, "Dịch vụ đã ngừng hoạt động", HttpStatus.CONFLICT),
    BOM_PART_NOT_ACTIVE(6403, "Phụ tùng trong BOM đã ngừng hoạt động", HttpStatus.CONFLICT),
    PART_NOT_FOUND(6404, "Không tìm thấy phụ tùng", HttpStatus.NOT_FOUND),
    PART_NOT_ACTIVE(6405, "Phụ tùng đã ngừng hoạt động", HttpStatus.CONFLICT),

    // Tích hợp service (65xx)
    INTEGRATION_SERVICE_UNAVAILABLE(6501, "Dịch vụ tích hợp tạm thời không khả dụng", HttpStatus.SERVICE_UNAVAILABLE),

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
