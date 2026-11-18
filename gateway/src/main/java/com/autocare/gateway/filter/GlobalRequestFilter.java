package com.autocare.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * GlobalFilter chạy cho MỌI request qua Gateway (ngoại trừ /healthz).
 *
 * 3 chức năng:
 *   1. Sinh/forward X-Request-Id (trace ID)
 *   2. Chèn X-User-* headers từ JWT claims (nếu user đã xác thực)
 *   3. Log mỗi request (method, path, status, duration)
 *
 * Ưu tiên:
 *   - getOrder() = Ordered.HIGHEST_PRECEDENCE + 10 → chạy trước LoggingFilter
 */
@Component
public class GlobalRequestFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(GlobalRequestFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        long start = System.currentTimeMillis();
        final String requestId;
        String incoming = exchange.getRequest().getHeaders().getFirst("X-Request-Id");
        if (incoming == null || incoming.isBlank()) {
            requestId = UUID.randomUUID().toString();
        } else {
            requestId = incoming;
        }

        ServerHttpRequest.Builder requestBuilder = exchange.getRequest().mutate()
                .header("X-Request-Id", requestId);

        // Forward Authorization xuống service (giữ nguyên)
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null) {
            requestBuilder.header("Authorization", authHeader);
        }

        // Sau khi JWT verify, lấy claims từ SecurityContext và chèn X-User-*
        ServerHttpRequest requestWithUser = requestBuilder.build();

        return ReactiveSecurityContextHolder.getContext()
                .flatMap(ctx -> {
                    Object principal = ctx.getAuthentication() != null
                            ? ctx.getAuthentication().getPrincipal()
                            : null;
                    if (principal instanceof Jwt jwt) {
                        ServerHttpRequest mutated = requestWithUser.mutate()
                                .header("X-User-Id",
                                        jwt.getSubject() != null ? jwt.getSubject() : "")
                                .header("X-User-Email",
                                        jwt.getClaimAsString("email") != null
                                                ? jwt.getClaimAsString("email") : "")
                                .header("X-User-Role",
                                        jwt.getClaimAsString("role") != null
                                                ? jwt.getClaimAsString("role") : "CUSTOMER")
                                .build();
                        return chain.filter(exchange.mutate().request(mutated).build());
                    }
                    return chain.filter(exchange.mutate().request(requestWithUser).build());
                })
                .switchIfEmpty(chain.filter(exchange.mutate().request(requestWithUser).build()))
                .then(Mono.fromRunnable(() -> {
                    long duration = System.currentTimeMillis() - start;
                    Integer statusCode = exchange.getResponse().getStatusCode() != null
                            ? exchange.getResponse().getStatusCode().value()
                            : null;
                    log.info("[{}] {} {} → {} ({}ms)",
                            requestId,
                            exchange.getRequest().getMethod(),
                            exchange.getRequest().getURI().getPath(),
                            statusCode,
                            duration);
                }));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}