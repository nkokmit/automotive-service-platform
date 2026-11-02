package com.example.booking_service.integration;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Chuyển tiếp JWT của người đang gọi booking-service sang service phía sau, để
 * inventory-service / staff-service tự kiểm tra quyền (SERVICE_READ, STAFF_SCHEDULE_READ).
 */
@Component
public class AuthorizationRelayInterceptor implements RequestInterceptor {

    @Override
    public void apply(RequestTemplate template) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            template.header("Authorization", "Bearer " + jwtAuthentication.getToken().getTokenValue());
        }
    }
}
