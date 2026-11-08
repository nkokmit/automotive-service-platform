package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.support.ServiceTokenProvider;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

public class BookingClientConfig {

    @Bean
    public RequestInterceptor bookingServiceTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret, "work-order-service", List.of("BOOKING_READ"), Clock.systemUTC());
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
