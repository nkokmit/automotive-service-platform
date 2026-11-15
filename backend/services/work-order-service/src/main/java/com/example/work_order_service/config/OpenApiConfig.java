package com.example.work_order_service.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI workOrderServiceOpenApi(@Value("${app.api-gateway-url}") String gatewayUrl) {
        return new OpenAPI()
                .info(new Info()
                        .title("Work Order Service API")
                        .description("API quản lý Work Order, Estimate, tiến độ sửa chữa và phụ tùng. "
                                + "Response theo contract {code, message, result}; lỗi phổ biến: "
                                + "1401 (401), 1403 (403), 6000 (400), 9999 (500). "
                                + "API dùng prefix /api, không có /v1.")
                        .version("1.0.0")
                        .contact(new Contact().name("Automotive Service Platform Team")))
                .addServersItem(new Server().url(gatewayUrl).description("API Gateway"))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Access token JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
