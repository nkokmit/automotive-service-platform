package com.example.api_gateway.exception;

import com.example.api_gateway.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Ghi body lỗi chuẩn của gateway ({@link ApiResponse}) vào response.
 *
 * <p>Tách riêng thành component để {@link GlobalErrorHandler} và
 * {@link SecurityErrorHandler} dùng chung một cách serialize, tránh lặp code.
 *
 * <p>Dùng {@code tools.jackson.databind.ObjectMapper} (Jackson 3) vì đây là
 * mapper mà Spring Boot 4 đang auto-configure cho gateway, và cũng là mapper
 * user-service đang dùng cho cùng một contract.
 *
 * <p>Không dùng {@code ObjectMapper#writeValue} (blocking) để tuân thủ
 * GLOBAL_RULES §20.12: không đưa blocking code vào Reactive Gateway.
 */
@Slf4j
public class GatewayErrorResponseWriter {

    private final ObjectMapper objectMapper;

    public GatewayErrorResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Set status rồi ghi {@code {code, message}} dạng JSON vào response body.
     *
     * <p>Nếu response đã commit thì không ghi lại (tránh
     * {@code UnsupportedOperationException}), chỉ log để không mất trace.
     */
    public Mono<Void> write(ServerWebExchange exchange, HttpStatusCode status, ErrorCode errorCode) {
        return write(exchange, status, errorCode.getCode(), errorCode.getMessage());
    }

    public Mono<Void> write(ServerWebExchange exchange,
                            HttpStatusCode status,
                            int code,
                            String message) {

        ServerHttpResponse response = exchange.getResponse();

        if (response.isCommitted()) {
            log.warn("Response already committed, skip writing gateway error body: status={}, code={}", status, code);
            return Mono.empty();
        }

        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        byte[] payload;
        try {
            payload = objectMapper.writeValueAsBytes(ApiResponse.error(code, message));
        } catch (JacksonException ex) {
            // Không serialize được thì vẫn trả status đúng, chỉ mất body chi tiết.
            log.error("Failed to serialize gateway error body, code={}", code, ex);
            return response.setComplete();
        }

        DataBuffer buffer = response.bufferFactory().wrap(payload);
        return response.writeWith(Mono.just(buffer));
    }
}