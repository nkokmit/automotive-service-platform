package com.autocare.gateway.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SpringDoc/Swagger config.
 *
 * Vì Spring Cloud Gateway là reactive WebFlux, ta dùng
 * springdoc-openapi-starter-webflux-ui.
 *
 * Cách truy cập Swagger UI gộp:
 *   http://localhost:4000/swagger-ui.html
 *
 * Đường dẫn /v3/api-docs ở Gateway trả về OpenAPI document của CHÍNH Gateway
 * (chỉ có /healthz vì Gateway bản thân không có API nghiệp vụ).
 *
 * Để xem docs của từng service, truy cập qua proxy:
 *   http://localhost:4000/docs/garage/swagger-ui.html
 *   http://localhost:4000/docs/services/swagger-ui.html
 *   http://localhost:4000/docs/auth/swagger-ui.html
 *   ...
 *
 * (Mỗi service backend cần bật springdoc-openapi ở port riêng của nó)
 */
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI gatewayOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Automotive Service Platform — API Gateway")
                        .description("""
                                API Gateway tổng hợp. Mọi request từ Frontend đều đi qua Gateway ở port 4000.
                                Gateway tự động route đến đúng microservice tương ứng.

                                **Auth**: `Authorization: Bearer <jwt>`

                                **Cấu trúc**:
                                - /api/v1/auth/**, /api/v1/users/** → user-service (8081)
                                - /api/v1/services/**, /api/v1/garages/**, /api/v1/cars/**, /api/v1/bookings/** → garage-service (8082)
                                - /api/v1/parts/**, /api/v1/cart/**, /api/v1/orders/** → commerce-service (8083)
                                - /api/v1/news/**, /api/v1/articles/**, /api/v1/categories/** → content-service (8084)
                                - /api/v1/ai/** → ai-services (9001/9002/9003)
                                """)
                        .version("1.0.0")
                        .contact(new Contact().name("Thành viên 1"))
                        .license(new License().name("MIT")))
                .externalDocs(new ExternalDocumentation()
                        .description("Contracts OpenAPI đầy đủ")
                        .url("/contracts/openapi.yaml"));
    }
}