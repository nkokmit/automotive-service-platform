package com.example.api_gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình route cho OpenAPI docs của các microservice qua Gateway.
 *
 * <p>Springdoc chạy trên <b>cùng context</b> với Spring Cloud Gateway, nên khi
 * Swagger UI fetch URL dạng {@code /v3/api-docs/{service}} thì request đó cũng
 * đi qua Gateway filter chain. Nếu không có route tương ứng, Gateway sẽ trả
 * 404 trước khi springdoc kịp xử lý.
 *
 * <p>Ta thêm các route chuyển tiếp OpenAPI JSON từ gateway xuống từng
 * microservice qua Eureka (lb://). Filter {@code rewritePath} chỉ dùng để
 * loại bỏ tên service ở cuối URL ({@code /v3/api-docs/user-service} →
 * {@code /v3/api-docs}); KHÔNG dùng {@code stripPrefix} vì sẽ làm mất
 * prefix {@code /v3/api-docs} mà microservice yêu cầu.
 *
 * <p>Route cho Swagger UI static resource ({@code /swagger-ui/**}) đã được
 * springdoc-starter-webflux-ui tự đăng ký nội bộ và không cần route ở gateway.
 *
 * <p><b>Lưu ý:</b> Khi bật security (JWT) ở gateway, các path dưới đây phải
 * được whitelist permitAll để client xem được Swagger UI / OpenAPI.
 */
@Configuration
public class SwaggerRouteConfig {

    @Bean
    public RouteLocator swaggerOpenApiRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
                // user-service OpenAPI: /v3/api-docs/user-service -> /v3/api-docs
                .route("openapi-user-service", r -> r
                        .path("/v3/api-docs/user-service", "/v3/api-docs/user-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/user-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://user-service"))
                // staff-service OpenAPI
                .route("openapi-staff-service", r -> r
                        .path("/v3/api-docs/staff-service", "/v3/api-docs/staff-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/staff-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://staff-service"))
                // customer-vehicle-service OpenAPI
                .route("openapi-customer-vehicle-service", r -> r
                        .path("/v3/api-docs/customer-vehicle-service",
                                "/v3/api-docs/customer-vehicle-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/customer-vehicle-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://customer-vehicle-service"))
                // booking-service OpenAPI
                .route("openapi-booking-service", r -> r
                        .path("/v3/api-docs/booking-service",
                                "/v3/api-docs/booking-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/booking-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://booking-service"))
                // work-order-service OpenAPI
                .route("openapi-work-order-service", r -> r
                        .path("/v3/api-docs/work-order-service",
                                "/v3/api-docs/work-order-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/work-order-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://work-order-service"))
                // inventory-service OpenAPI
                .route("openapi-inventory-service", r -> r
                        .path("/v3/api-docs/inventory-service",
                                "/v3/api-docs/inventory-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/inventory-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://inventory-service"))
                // billing-service OpenAPI
                .route("openapi-billing-service", r -> r
                        .path("/v3/api-docs/billing-service",
                                "/v3/api-docs/billing-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/billing-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://billing-service"))
                // notification-service OpenAPI
                .route("openapi-notification-service", r -> r
                        .path("/v3/api-docs/notification-service",
                                "/v3/api-docs/notification-service/**")
                        .filters(f -> f.rewritePath(
                                "/v3/api-docs/notification-service(?<segment>/.*)?",
                                "/v3/api-docs${segment}"))
                        .uri("lb://notification-service"))
                .build();
    }
}
