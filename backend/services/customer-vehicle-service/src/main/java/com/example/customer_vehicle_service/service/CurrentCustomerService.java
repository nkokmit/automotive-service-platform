package com.example.customer_vehicle_service.service;

import java.util.UUID;

/**
 * Tra cứu hồ sơ khách hàng đang đăng nhập từ SecurityContext.
 *
 * <p>Cầu nối danh tính: JWT do user-service cấp mang {@code sub} (username) và
 * claim {@code userId} (UUID tài khoản), còn {@code customers.user_id} lưu
 * đúng UUID đó. Claim {@code userId} là nơi duy nhất để service này biết
 * caller nào là chủ xe mà không cần gọi user-service.
 *
 * <p>Hợp đồng: mọi cách không xác định được chủ xe đều fail closed bằng 403,
 * không bao giờ trả dữ liệu. Xem {@link CurrentCustomerServiceImpl}.
 */
public interface CurrentCustomerService {

    /**
     * Hồ sơ khách hàng của caller hiện tại.
     *
     * @throws org.springframework.security.access.AccessDeniedException nếu không
     *         xác định được chủ xe (thiếu claim {@code userId}, claim sai định
     *         dạng, không có hồ sơ khách hàng, hoặc hồ sơ đã bị xoá mềm)
     */
    UUID getRequiredCustomerId();
}