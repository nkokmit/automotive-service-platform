package com.example.api_gateway.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình OpenAPI/Swagger cho api-gateway.
 *
 * <p>Gateway gộp (aggregate) OpenAPI specs từ các microservice qua Eureka
 * discovery, expose thành một entry point duy nhất cho client:
 * <ul>
 *   <li>Swagger UI: {@code /swagger-ui.html} (redirect tới {@code /swagger-ui/index.html})</li>
 *   <li>OpenAPI JSON gộp: {@code /v3/api-docs}</li>
 *   <li>OpenAPI JSON theo service: {@code /v3/api-docs/{serviceId}}</li>
 * </ul>
 *
 * <p>Việc gộp spec được cấu hình qua {@code springdoc.swagger-ui.urls} và
 * {@code springdoc.api-docs.path} trong {@code application.yaml}.
 *
 * <p><b>LƯU Ý BẢO MẬT:</b> Khi bật xác thực (JWT), phải whitelist các path
 * {@code /v3/api-docs/**}, {@code /swagger-ui/**}, {@code /swagger-ui.html}
 * ở gateway nếu muốn giữ Swagger UI khả dụng, hoặc chủ động chặn ở môi
 * trường production.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI apiGatewayOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Automotive Service Platform - API Gateway")
                        .description("API Gateway aggregate OpenAPI specs từ các microservice "
                                + "(user-service, staff-service, customer-vehicle-service, "
                                + "booking-service, work-order-service, inventory-service, "
                                + "billing-service, notification-service) - "
                                + "Automotive Service Platform")
                        .version("v1.0.0")
                        .contact(new Contact().name("Automotive Service Platform Team")));
    }
}
