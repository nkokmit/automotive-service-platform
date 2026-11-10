package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.support.ServiceTokenProvider;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

public class InventoryServiceClientConfig {

    @Bean
    public RequestInterceptor inventoryServiceTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret, "work-order-service",
                List.of("INTERNAL_SERVICE_CATALOG_READ", "INTERNAL_PART_CATALOG_READ",
                        "INTERNAL_PART_STOCK_WRITE"), Clock.systemUTC());
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
