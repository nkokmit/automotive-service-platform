package com.example.notification_service.integration.client;

import com.example.notification_service.integration.support.ServiceTokenProvider;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

public class CustomerVehicleClientConfig {

    @Bean
    public RequestInterceptor customerVehicleServiceTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret,
                "notification-service",
                List.of("INTERNAL_CUSTOMER_READ", "INTERNAL_VEHICLE_READ"),
                Clock.systemUTC()
        );
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
