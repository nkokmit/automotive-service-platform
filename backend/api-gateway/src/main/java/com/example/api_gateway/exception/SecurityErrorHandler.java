package com.example.api_gateway.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authorization.ServerAccessDeniedHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

/**
 * Trả 401/403 đúng {@link com.example.api_gateway.common.ApiResponse} contract.
 *
 * <p>Cần handler này vì gateway dùng resource server JWT: khi request không có
 * token, token sai hoặc hết hạn, {@code AuthenticationWebFilter} ném lỗi ngay
 * trong security filter chain - không đi qua tầng xử lý lỗi WebFlux. Nếu không
 * cấu hình, client nhận body rỗng của Spring, vi phạm GLOBAL_RULES §15.
 *
 * <p>Đây là bản reactive tương ứng với
 * {@code CustomAuthenticationEntryPoint}/{@code CustomAccessDeniedHandler}
 * (bản servlet) đang dùng ở user-service.
 *
 * <p>Mã lỗi 1401/1403 cố ý trùng user-service để client xử lý auth thống nhất,
 * không phân biệt lỗi phát sinh ở gateway hay service phía sau.
 */
@Slf4j
@Component
public class SecurityErrorHandler implements ServerAuthenticationEntryPoint, ServerAccessDeniedHandler {

    private final GatewayErrorResponseWriter responseWriter;

    public SecurityErrorHandler(ObjectMapper objectMapper) {
        this.responseWriter = new GatewayErrorResponseWriter(objectMapper);
    }

    /**
     * 401 - thiếu token, token không hợp lệ hoặc đã hết hạn.
     *
     * <p>Không echo lý do cụ thể (vd "token expired") để không tiết lộ thông tin
     * cho client; luôn trả message chung của {@link ErrorCode#UNAUTHENTICATED}.
     */
    @Override
    public Mono<Void> commence(ServerWebExchange exchange, AuthenticationException authException) {
        log.warn("Authentication failed for {} {}: {}",
                exchange.getRequest().getMethod(),
                exchange.getRequest().getPath().value(),
                authException.getMessage());
        return responseWriter.write(exchange, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHENTICATED);
    }

    /**
     * 403 - request đã xác thực nhưng không đủ quyền.
     *
     * <p>Gateway chỉ validate JWT (GLOBAL_RULES §6), phần quyền theo từng
     * operation vẫn do service phía sau thực hiện. Handler này chỉ phục vụ các
     * rule {@code authorizeExchange} của chính gateway.
     */
    @Override
    public Mono<Void> handle(ServerWebExchange exchange, AccessDeniedException accessDeniedException) {
        log.warn("Access denied for {} {}",
                exchange.getRequest().getMethod(),
                exchange.getRequest().getPath().value());
        return responseWriter.write(exchange, HttpStatus.FORBIDDEN, ErrorCode.UNAUTHORIZED);
    }
}