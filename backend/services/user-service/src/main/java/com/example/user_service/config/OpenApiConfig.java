package com.example.user_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình OpenAPI/Swagger cho user-service.
 *
 * <p>Swagger UI: {@code /swagger-ui.html} (redirect tới {@code /swagger-ui/index.html}).
 * <p>OpenAPI JSON: {@code /v3/api-docs}.
 *
 * <p><b>LƯU Ý BẢO MẬT:</b> {@link SecurityConfig} hiện permitAll toàn bộ request nên các
 * endpoint trên đang công khai. Khi bật xác thực thật (JWT/Keycloak), phải whitelist các
 * path {@code /v3/api-docs/**}, {@code /swagger-ui/**}, {@code /swagger-ui.html} nếu muốn
 * giữ Swagger UI khả dụng, hoặc chủ động chặn ở môi trường production.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI userServiceOpenApi(
            @Value("${app.api-gateway-url}") String gatewayUrl) {

        return new OpenAPI()
                .info(new Info()
                        .title("User Service API")
                        .description("API quản lý User, Role, Permission - Automotive Service Platform")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Automotive Service Platform Team")))
                .addServersItem(
                        new Server()
                                .url(gatewayUrl)
                                .description("API Gateway")
                );
    }
}
