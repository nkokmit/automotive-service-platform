package com.example.booking_service.integration.staff;

import com.example.booking_service.integration.support.ServiceTokenProvider;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.util.List;

/**
 * Cấu hình riêng cho StaffScheduleClient (cố ý không gắn @Configuration để không áp dụng cho
 * các Feign client khác): gọi staff-service bằng token dịch vụ thay vì JWT của khách.
 */
public class StaffScheduleClientConfig {

    @Bean
    public RequestInterceptor staffServiceTokenInterceptor(@Value("${jwt.secret}") String secret) {
        ServiceTokenProvider provider = new ServiceTokenProvider(
                secret, "booking-service", List.of("INTERNAL_STAFF_CAPACITY_READ"), Clock.systemUTC());
        return template -> template.header("Authorization", "Bearer " + provider.getToken());
    }
}
