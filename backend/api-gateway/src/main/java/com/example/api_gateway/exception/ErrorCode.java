package com.example.api_gateway.exception;

/**
 * Mã lỗi của api-gateway.
 *
 * <p>Quy ước:
 * <ul>
 *   <li>9999 / 1000 - lỗi chung, giống user-service để client xử lý thống nhất</li>
 *   <li>14xx - authentication/authorization, <b>cố ý trùng với user-service</b>
 *       (1401 / 1403) để client không phải phân biệt lỗi auth phát sinh ở
 *       gateway hay ở service phía sau</li>
 *   <li>15xx - lỗi riêng của gateway: routing, proxy, service discovery</li>
 * </ul>
 */
public enum ErrorCode {

    // Chung (giữ nguyên số để nhất quán với user-service)
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    // Authentication & Authorization (14xx - trùng user-service)
    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ"),
    UNAUTHORIZED(1403, "Bạn không có quyền"),

    // Gateway routing (15xx)
    SERVICE_UNAVAILABLE(1501, "Dịch vụ đang tạm thời không khả dụng"),
    GATEWAY_TIMEOUT(1502, "Dịch vụ phía sau phản hồi quá thời gian cho phép"),
    UPSTREAM_ERROR(1503, "Dịch vụ phía sau trả về lỗi"),
    ROUTE_NOT_FOUND(1504, "Không tìm thấy endpoint tương ứng");

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