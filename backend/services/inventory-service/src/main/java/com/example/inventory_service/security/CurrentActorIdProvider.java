package com.example.inventory_service.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;

import java.util.UUID;

/**
 * Lấy ID tài khoản đang đăng nhập từ JWT.
 *
 * <p>Cần cho các bảng có cột {@code created_by NOT NULL}
 * ({@code purchase_orders}, {@code inventory_transactions}). ID này thuộc
 * user-service nên chỉ lưu dạng UUID, không tạo JPA relationship
 * (GLOBAL_RULES §2).
 */
@Component
@Slf4j
public class CurrentActorIdProvider {

    /**
     * Như {@link #getCurrentUserId()} nhưng ném lỗi khi không xác định được
     * người dùng. Dùng cho thao tác ghi vào cột {@code created_by NOT NULL}.
     */
    public UUID requireCurrentUserId() {
        UUID userId = getCurrentUserId();
        if (userId == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED, "Không xác định được người dùng từ token");
        }
        return userId;
    }

    /**
     * @return UUID của user hiện tại, hoặc {@code null} nếu token không mang
     *         claim {@code userId} hợp lệ.
     */
    public UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            return null;
        }

        String userId = jwtAuthentication.getToken().getClaimAsString("userId");
        if (userId != null && !userId.isBlank()) {
            try {
                return UUID.fromString(userId);
            } catch (IllegalArgumentException exception) {
                log.warn("JWT userId claim is not a UUID; actor ID will not be recorded");
                return null;
            }
        }

        try {
            return UUID.fromString(jwtAuthentication.getToken().getSubject());
        } catch (IllegalArgumentException exception) {
            log.warn("JWT has no UUID userId claim or UUID subject; actor ID will not be recorded");
            return null;
        }
    }
}
