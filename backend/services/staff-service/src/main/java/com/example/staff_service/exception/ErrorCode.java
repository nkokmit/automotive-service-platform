package com.example.staff_service.exception;

/**
 * Mã lỗi thống nhất cho staff-service.
 *
 * <p>Mã chung giữ nguyên theo convention của các service; lỗi nghiệp vụ staff
 * dùng dải 30xx và lỗi ca làm việc dùng dải 31xx.
 */
public enum ErrorCode {

    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),
    UNAUTHORIZED(1403, "Bạn không có quyền"),

    // Staff (30xx)
    STAFF_NOT_FOUND(3001, "Không tìm thấy nhân viên"),
    STAFF_ALREADY_EXISTS(3002, "Mã nhân viên đã tồn tại"),
    STAFF_USER_ID_EXISTS(3005, "Tài khoản đã liên kết với nhân viên khác"),

    // WorkShift (31xx)
    WORK_SHIFT_NOT_FOUND(3101, "Không tìm thấy ca làm việc"),
    WORK_SHIFT_ALREADY_EXISTS(3102, "Mã ca làm việc đã tồn tại"),
    WORK_SHIFT_IN_USE(3103, "Ca làm việc đã được dùng trong lịch và không thể xóa");

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
