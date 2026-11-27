package com.example.news_service.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Lấy ID tài khoản đang đăng nhập từ JWT.
 *
 * <p>ID này thuộc user-service nên chỉ lưu dạng UUID, không tạo JPA
 * relationship (GLOBAL_RULES §2).
 */
@Component
@Slf4j
public class CurrentActorIdProvider {

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

    /**
     * @return tên hiển thị của user hiện tại.
     *
     * <p>JWT do user-service sinh chỉ mang {@code sub} (username) và
     * {@code userId} — không có claim tên hiển thị — nên fallback về username.
     */
    public String getCurrentUserName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            return null;
        }
        String name = jwtAuthentication.getToken().getClaimAsString("fullName");
        if (name == null || name.isBlank()) {
            name = jwtAuthentication.getToken().getClaimAsString("name");
        }
        if (name == null || name.isBlank()) {
            // user-service chỉ đưa `sub` (username) vào token — dùng làm tên hiển thị.
            name = jwtAuthentication.getToken().getSubject();
        }
        return (name == null || name.isBlank()) ? null : name;
    }
}
