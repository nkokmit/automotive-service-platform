package com.autocare.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.oauth2.resource.reactive.ReactiveOAuth2ResourceServerAutoConfiguration;

/**
 * API Gateway cho Automotive Service Platform.
 *
 * Chạy port 4000. Route mỗi request từ Frontend đến các microservice:
 *   user-service (8081), garage-service (8082), commerce-service (8083),
 *   content-service (8084), ai-services (9001/9002/9003).
 *
 * Xem cấu hình routing tại {@link com.autocare.gateway.config.RouteConfig}.
 *
 * Note: Exclude ReactiveOAuth2ResourceServerAutoConfiguration vì JwtConfig tự quản lý
 * JwtDecoder với @ConditionalOnProperty.
 */
@SpringBootApplication(exclude = ReactiveOAuth2ResourceServerAutoConfiguration.class)
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}