package com.example.booking_service.exception;

/**
 * Mã lỗi thống nhất cho booking-service.
 *
 * <p>Quy ước:
 * <ul>
 *   <li>9999 / 1000 - lỗi chung, giữ nguyên số để client xử lý thống nhất</li>
 *   <li>14xx - authentication/authorization, cố ý trùng với các service khác
 *       (1401 / 1403)</li>
 *   <li>50xx - Booking · 51xx - dịch vụ dự kiến trong booking ·
 *       52xx - sức chứa kỹ thuật viên & tích hợp service khác</li>
 * </ul>
 */
public enum ErrorCode {

    // Chung
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    // Booking (50xx)
    BOOKING_NOT_FOUND(5001, "Không tìm thấy lịch hẹn"),
    INVALID_BOOKING_TIME(5002, "Thời gian đặt lịch không hợp lệ"),
    INVALID_BOOKING_STATUS_TRANSITION(5003, "Chuyển trạng thái lịch hẹn không hợp lệ"),

    // Dịch vụ dự kiến trong booking (51xx)
    SERVICE_NOT_FOUND(5101, "Không tìm thấy dịch vụ"),
    SERVICE_UNAVAILABLE(5102, "Dịch vụ không đang được cung cấp"),

    // Sức chứa & tích hợp (52xx)
    INSUFFICIENT_TECHNICIAN_CAPACITY(5201, "Không đủ kỹ thuật viên khả dụng"),
    INTEGRATION_SERVICE_UNAVAILABLE(5202, "Dịch vụ tích hợp tạm thời không khả dụng"),
    EVENT_PUBLISH_FAILED(5203, "Không thể phát sự kiện, vui lòng thử lại"),

    // Khách hàng & xe (53xx)
    CUSTOMER_NOT_FOUND(5301, "Không tìm thấy hồ sơ khách hàng hợp lệ"),
    VEHICLE_NOT_FOUND(5302, "Không tìm thấy hồ sơ xe hợp lệ"),
    VEHICLE_PLATE_MISMATCH(5303, "Biển số xe không khớp với biển số trong lịch hẹn"),
    VEHICLE_ALREADY_LINKED(5304, "Lịch hẹn đã được liên kết với xe khác"),
    CHECK_IN_REQUIREMENTS_NOT_MET(5305, "Chưa đủ điều kiện tiếp nhận xe"),

    // Authentication & Authorization (14xx)
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
