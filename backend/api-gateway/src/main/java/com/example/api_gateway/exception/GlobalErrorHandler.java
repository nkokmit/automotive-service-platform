package com.example.api_gateway.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.webflux.error.ErrorWebExceptionHandler;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.cloud.gateway.support.ServiceUnavailableException;
import org.springframework.cloud.gateway.support.TimeoutException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

/**
 * Global exception handler của api-gateway.
 *
 * <p>Dùng {@link ErrorWebExceptionHandler} chứ không dùng
 * {@code @RestControllerAdvice} vì gateway chạy WebFlux (reactive), không có tầng
 * MVC nên {@code @ExceptionHandler} của Spring MVC không được áp dụng
 * (GLOBAL_RULES §14 nói dùng {@code @RestControllerAdvice} cho service MVC).
 *
 * <p>Handler này chỉ xử lý lỗi <b>phát sinh tại gateway</b>: không khớp route,
 * hết thời gian chờ upstream, không tìm được instance qua Eureka/LoadBalancer.
 *
 * <p>Handler <b>không</b> can thiệp vào response của upstream khi upstream đã
 * trả kết quả: gateway không đóng vai trò authorizer, không chuẩn hóa lại body
 * của service (xem {@code SERVICES/user-service.md} - "The API Gateway only
 * validates the JWT ... authorization must stay in this service"). Nếu service
 * phía sau trả lỗi nghiệp vụ theo {@link com.example.api_gateway.common.ApiResponse}
 * riêng của nó thì body đó được giữ nguyên.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalErrorHandler implements ErrorWebExceptionHandler {

    private final GatewayErrorResponseWriter responseWriter;

    public GlobalErrorHandler(ObjectMapper objectMapper) {
        this.responseWriter = new GatewayErrorResponseWriter(objectMapper);
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {

        // Response đã được commit (ví dụ upstream đã bắt đầu ghi body) thì không
        // thể đổi status nữa; trả về để WebFlux tự kết thúc response.
        if (exchange.getResponse().isCommitted()) {
            return Mono.error(ex);
        }

        return switch (ex) {
            case NotFoundException nfe ->
                    handleRouteNotFound(exchange, nfe);

            case TimeoutException te ->
                    handleGatewayError(exchange, te,
                            ErrorCode.GATEWAY_TIMEOUT, HttpStatus.GATEWAY_TIMEOUT);

            case ServiceUnavailableException sue ->
                    handleGatewayError(exchange, sue,
                            ErrorCode.SERVICE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);

            case ResponseStatusException rse ->
                    handleResponseStatusException(exchange, rse);

            default ->
                    handleGatewayError(exchange, ex,
                            ErrorCode.UPSTREAM_ERROR, HttpStatus.BAD_GATEWAY);
        };
    }

    /**
     * Không có route khớp path trong gateway. Trả 404 với mã của gateway.
     *
     * <p>Đây là lỗi ở tầng gateway (path không được định nghĩa trong
     * {@code application.yaml} / {@code SwaggerRouteConfig}), không phải lỗi
     * nghiệp vụ của service nào, nên dùng mã 15xx riêng.
     */
    private Mono<Void> handleRouteNotFound(ServerWebExchange exchange, NotFoundException ex) {
        log.warn("No gateway route matched {} {}: {}",
                exchange.getRequest().getMethod(),
                exchange.getRequest().getPath().value(),
                ex.getMessage());
        return responseWriter.write(exchange, HttpStatus.NOT_FOUND, ErrorCode.ROUTE_NOT_FOUND);
    }

    /**
     * Giữ nguyên status mà Spring/gateway đã quyết định (ví dụ 405, 415, 413)
     * nhưng vẫn trả body đúng contract {@link com.example.api_gateway.common.ApiResponse}.
     *
     * <p>Chỉ ghi body khi status là lỗi client/server. Status thành công (2xx/3xx)
     * được giữ nguyên và không ghi body, tránh phá hợp đồng của response đó.
     */
    private Mono<Void> handleResponseStatusException(ServerWebExchange exchange,
                                                    ResponseStatusException ex) {

        var status = ex.getStatusCode();

        if (status.isError()) {
            ErrorCode errorCode = ErrorCode.UNCATEGORIZED_EXCEPTION;
            String message = ex.getReason() != null ? ex.getReason() : errorCode.getMessage();
            log.warn("Request rejected with status {}: {}", status.value(), message);
            return responseWriter.write(exchange, status, errorCode.getCode(), message);
        }

        exchange.getResponse().setStatusCode(status);
        return exchange.getResponse().setComplete();
    }

    private Mono<Void> handleGatewayError(ServerWebExchange exchange,
                                          Throwable ex,
                                          ErrorCode errorCode,
                                          HttpStatus status) {
        log.error("Gateway error [{}]: {}", errorCode.getCode(), ex.getMessage(), ex);
        return responseWriter.write(exchange, status, errorCode);
    }
}