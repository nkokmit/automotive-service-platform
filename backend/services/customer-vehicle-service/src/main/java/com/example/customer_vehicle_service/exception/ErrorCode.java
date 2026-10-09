package com.example.customer_vehicle_service.exception;

/**
 * Mã lỗi thống nhất cho toàn bộ service.
 *
 * <p>Quy ước:
 * <ul>
 *   <li>9999 / 1000 - lỗi chung, giữ nguyên số để client xử lý thống nhất</li>
 *   <li>14xx - authentication/authorization, <b>cố ý trùng với user-service</b>
 *       (1401 / 1403) để client không phải phân biệt lỗi auth phát sinh ở
 *       gateway hay ở service phía sau</li>
 *   <li>20xx - Customer, 21xx - Vehicle, 22xx - ServiceHistory</li>
 * </ul>
 */
public enum ErrorCode {

    // Chung
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    // Customer (20xx)
    CUSTOMER_NOT_FOUND(2001, "Không tìm thấy khách hàng"),
    CUSTOMER_ALREADY_EXISTS(2002, "Khách hàng đã tồn tại"),
    CUSTOMER_EMAIL_EXISTS(2003, "Email khách hàng đã tồn tại"),
    CUSTOMER_PHONE_EXISTS(2004, "Số điện thoại khách hàng đã tồn tại"),
    CUSTOMER_USER_ID_EXISTS(2005, "Tài khoản đã liên kết với khách hàng khác"),
    CUSTOMER_HAS_ACTIVE_VEHICLES(2006, "Khách hàng còn xe đang hoạt động"),

    // Vehicle (21xx)
    VEHICLE_NOT_FOUND(2101, "Không tìm thấy xe"),
    VEHICLE_ALREADY_EXISTS(2102, "Xe đã tồn tại"),
    VEHICLE_LICENSE_PLATE_EXISTS(2103, "Biển số xe đã tồn tại"),
    VEHICLE_VIN_EXISTS(2104, "VIN đã tồn tại"),

    // ServiceHistory (22xx)
    SERVICE_HISTORY_NOT_FOUND(2201, "Không tìm thấy lịch sử bảo dưỡng"),

    // Authentication & Authorization (14xx)
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