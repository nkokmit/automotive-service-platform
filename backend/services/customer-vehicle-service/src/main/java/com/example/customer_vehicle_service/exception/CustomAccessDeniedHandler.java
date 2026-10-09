package com.example.customer_vehicle_service.exception;

import com.example.customer_vehicle_service.common.ApiResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Trả 403 đúng {@link ApiResponse} contract khi request bị từ chối phân quyền.
 *
 * <p>Xử lý lỗi phân quyền trong security filter chain; lỗi từ method security
 * tại tầng MVC được {@link GlobalExceptionHandler#handleAccessDenied(AccessDeniedException)}
 * xử lý theo cùng contract.
 */
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException, ServletException {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        ApiResponse<?> apiResponse = ApiResponse.error(
                errorCode.getCode(),
                errorCode.getMessage()
        );
        ObjectMapper objectMapper = new ObjectMapper();

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        response.flushBuffer();
    }
}