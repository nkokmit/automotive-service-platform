package com.example.user_service.config;

import com.example.user_service.security.SecurityConfig;
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

/**
 * Cấu hình OpenAPI/Swagger cho user-service.
 *
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
                )
                .components(
                        new Components()
                                .addSecuritySchemes(
                                        "bearerAuth",
                                        new SecurityScheme()
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")
                                                .description("Nhập Access Token JWT")))

                .addSecurityItem(
                        new SecurityRequirement()
                                .addList("bearerAuth"));
    }
}
