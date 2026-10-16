package com.example.user_service.exception;

import com.example.user_service.common.ApiResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Trả 403 đúng {@link ApiResponse} contract khi request bị từ chối phân quyền.
 *
 * <p>Cần handler này vì {@code @PreAuthorize} ném {@link AccessDeniedException}
 * trước khi request tới tầng MVC, nên
 * {@link GlobalExceptionHandler#handleAccessDenied(AccessDeniedException)}
 * không bao giờ được gọi tới. Không có handler này thì client nhận body rỗng
 * của Spring, vi phạm GLOBAL_RULES §15.
 */
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException, ServletException {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
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