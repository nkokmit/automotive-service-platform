package com.example.billing_service.integration.client;

import com.example.billing_service.integration.support.ServiceTokenProvider;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

public class WorkOrderClientConfig {

    @Bean
    public RequestInterceptor workOrderServiceTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret, "billing-service", List.of("WORK_ORDER_READ", "ESTIMATE_READ"), Clock.systemUTC());
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
