package com.autocare.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * ⭐ SINGLE SOURCE OF TRUTH cho routing của Gateway.
 *
 * Mỗi microservice domain được map qua 1 (hoặc vài) route cụ thể.
 * Thay đổi port/host của upstream → đổi ENV var, KHÔNG cần sửa code.
 *
 * ENV vars mặc định (override trong docker-compose hoặc application-{env}.yml):
 *   USER_SVC_URL       = http://localhost:8081
 *   GARAGE_SVC_URL     = http://localhost:8082
 *   COMMERCE_SVC_URL   = http://localhost:8083
 *   CONTENT_SVC_URL    = http://localhost:8084
 *   AI_DAMAGE_URL      = http://localhost:9001
 *   AI_RECOMMEND_URL   = http://localhost:9002
 *   AI_AGENT_URL       = http://localhost:9003
 *
 * Mọi request đều có 3 filter chung:
 *   - RequestIdFilter   : gắn X-Request-Id để trace
 *   - LoggingFilter     : log method, path, status, duration
 *   - JwtAuthFilter     : verify JWT, chèn X-User-* headers
 */
@Configuration
public class RouteConfig {

    @Value("${USER_SVC_URL:http://localhost:8081}")
    private String userSvc;

    @Value("${GARAGE_SVC_URL:http://localhost:8082}")
    private String garageSvc;

    @Value("${COMMERCE_SVC_URL:http://localhost:8083}")
    private String commerceSvc;

    @Value("${CONTENT_SVC_URL:http://localhost:8084}")
    private String contentSvc;

    @Value("${AI_DAMAGE_URL:http://localhost:9001}")
    private String aiDamage;

    @Value("${AI_RECOMMEND_URL:http://localhost:9002}")
    private String aiRecommend;

    @Value("${AI_AGENT_URL:http://localhost:9003}")
    private String aiAgent;

    @Bean
    public RouteLocator customRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
                // ──────────────────────────────────────────────
                // /healthz được handle bởi HealthController
                // (KHÔNG route đến upstream nào)
                // ──────────────────────────────────────────────

                // ──────────────────────────────────────────────
                // AUTH & USER  →  user-service
                // ──────────────────────────────────────────────
                .route("auth-public", r -> r
                        .path("/api/v1/auth/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(userSvc))

                .route("users-private", r -> r
                        .path("/api/v1/users/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(userSvc))

                // ──────────────────────────────────────────────
                // GARAGE  →  garage-service
                // ──────────────────────────────────────────────
                .route("garage-services", r -> r
                        .path("/api/v1/services/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(garageSvc))

                .route("garage-garages", r -> r
                        .path("/api/v1/garages/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(garageSvc))

                .route("garage-cars", r -> r
                        .path("/api/v1/cars/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(garageSvc))

                .route("garage-bookings", r -> r
                        .path("/api/v1/bookings/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(garageSvc))

                .route("garage-timeslots", r -> r
                        .path("/api/v1/timeslots/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(garageSvc))

                // ──────────────────────────────────────────────
                // COMMERCE  →  commerce-service
                // ──────────────────────────────────────────────
                .route("commerce-parts", r -> r
                        .path("/api/v1/parts/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(commerceSvc))

                .route("commerce-cart", r -> r
                        .path("/api/v1/cart/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(commerceSvc))

                .route("commerce-orders", r -> r
                        .path("/api/v1/orders/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(commerceSvc))

                // ──────────────────────────────────────────────
                // CONTENT  →  content-service
                // ──────────────────────────────────────────────
                .route("content-news", r -> r
                        .path("/api/v1/news/**", "/api/v1/articles/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(contentSvc))

                .route("content-categories", r -> r
                        .path("/api/v1/categories/**")
                        .filters(f -> f.stripPrefix(2))
                        .uri(contentSvc))

                // ──────────────────────────────────────────────
                // AI  →  ai-services
                // ──────────────────────────────────────────────
                .route("ai-damage", r -> r
                        .path("/api/v1/ai/damage/**")
                        .filters(f -> f.stripPrefix(4)
                                .setRequestSize(org.springframework.util.unit.DataSize.ofMegabytes(50)))    // 50MB cho upload ảnh
                        .uri(aiDamage))

                .route("ai-recommend", r -> r
                        .path("/api/v1/ai/recommend/**")
                        .filters(f -> f.stripPrefix(4))
                        .uri(aiRecommend))

                .route("ai-agent", r -> r
                        .path("/api/v1/ai/assistant/**")
                        .filters(f -> f.stripPrefix(4))
                        .uri(aiAgent))

                // ──────────────────────────────────────────────
                // SWAGGER UI  →  proxy về từng service
                // VD: GET /docs/auth/swagger-ui.html  → user-service/swagger-ui.html
                // ──────────────────────────────────────────────
                .route("swagger-user", r -> r
                        .path("/docs/auth/**", "/docs/users/**")
                        .filters(f -> f.rewritePath("/docs/(auth|users)/(?<segment>.*)", "/$\\{segment}"))
                        .uri(userSvc))

                .route("swagger-garage", r -> r
                        .path("/docs/garage/**", "/docs/services/**")
                        .filters(f -> f.rewritePath("/docs/(garage|services)/(?<segment>.*)", "/$\\{segment}"))
                        .uri(garageSvc))

                .route("swagger-commerce", r -> r
                        .path("/docs/commerce/**", "/docs/parts/**")
                        .filters(f -> f.rewritePath("/docs/(commerce|parts)/(?<segment>.*)", "/$\\{segment}"))
                        .uri(commerceSvc))

                .route("swagger-content", r -> r
                        .path("/docs/content/**", "/docs/news/**")
                        .filters(f -> f.rewritePath("/docs/(content|news)/(?<segment>.*)", "/$\\{segment}"))
                        .uri(contentSvc))

                .build();
    }
}