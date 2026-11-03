package com.example.booking_service.integration;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

/** Cấu hình riêng cho InventoryServiceClient (không gắn @Configuration để không thành global). */
public class InventoryServiceClientConfig {

    @Bean
    public RequestInterceptor inventoryServiceTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret, "booking-service", List.of("INTERNAL_SERVICE_CATALOG_READ"), Clock.systemUTC());
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
