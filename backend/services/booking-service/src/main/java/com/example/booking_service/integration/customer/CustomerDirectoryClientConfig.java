package com.example.booking_service.integration.customer;

import com.example.booking_service.integration.support.ServiceTokenProvider;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

/**
 * Cấu hình riêng cho CustomerDirectoryClient (không gắn @Configuration để không thành global):
 * gọi API nội bộ của customer-vehicle-service bằng token dịch vụ thay vì JWT của nhân viên.
 */
public class CustomerDirectoryClientConfig {

    @Bean
    public RequestInterceptor customerDirectoryTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret, "booking-service",
                List.of("INTERNAL_CUSTOMER_READ", "INTERNAL_VEHICLE_READ"),
                Clock.systemUTC());
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
