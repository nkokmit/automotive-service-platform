package com.example.user_service.exception;

/**
 * Mã lỗi thống nhất cho toàn bộ service.
 *
 * <p>Quy ước: 1xxx = lỗi nghiệp vụ chung, 10xx = User, 11xx = Role, 12xx = Permission.
 */
public enum ErrorCode {

    // Chung
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    // User (10xx)
    USER_NOT_FOUND(1001, "Không tìm thấy người dùng"),
    USER_ALREADY_EXISTS(1002, "Username hoặc email đã tồn tại"),
    USER_USERNAME_EXISTS(1003, "Username đã tồn tại"),
    USER_EMAIL_EXISTS(1004, "Email đã tồn tại"),

    // Role (11xx)
    ROLE_NOT_FOUND(1101, "Không tìm thấy vai trò"),
    ROLE_ALREADY_EXISTS(1102, "Vai trò đã tồn tại"),

    // Permission (12xx)
    PERMISSION_NOT_FOUND(1201, "Không tìm thấy quyền"),
    PERMISSION_ALREADY_EXISTS(1202, "Quyền đã tồn tại");

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
