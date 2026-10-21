package com.example.customer_vehicle_service.exception;

import org.springframework.security.access.AccessDeniedException;

/**
 * Không ánh xạ được tài khoản đang đăng nhập tới hồ sơ khách hàng.
 *
 * <p>Tách khỏi {@link AccessDeniedException} thuần chỉ để
 * {@code GlobalExceptionHandler} trả lại đúng lý do thay vì câu chung
 * {@code "Bạn không có quyền"}. Caller đã đăng nhập thành công và được phép
 * gọi endpoint tự phục vụ; họ chỉ thiếu hồ sơ để gọi được. Trả câu chung khiến
 * người dùng tưởng mình thiếu quyền, trong khi hành động đúng là liên hệ gara
 * để liên kết tài khoản — hai việc hoàn toàn khác nhau.
 *
 * <p>Cố ý mở rộng {@link AccessDeniedException} để giữ nguyên hợp đồng fail
 * closed đã chốt ở PLAN.md bước 7: mọi đường không xác định được chủ xe vẫn
 * trả 403 và không bao giờ trả dữ liệu. Message chỉ nói về chính tài khoản của
 * caller (thiếu claim, claim sai định dạng, hoặc chưa có hồ sơ) nên không lộ
 * thông tin của khách hàng khác.
 *
 * <p>Ngược lại, {@code AccessDeniedException} do {@code @PreAuthorize} ném ra
 * vẫn phải giữ message chung: đó là kết quả của việc thiếu quyền trên
 * operation, không phải trạng thái dữ liệu của chính caller.
 */
public class CustomerProfileUnresolvedException extends AccessDeniedException {

    public CustomerProfileUnresolvedException(String message) {
        super(message);
    }
}