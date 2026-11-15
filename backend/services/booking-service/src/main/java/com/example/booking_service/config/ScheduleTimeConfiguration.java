package com.example.booking_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.DateTimeException;
import java.time.ZoneId;

/**
 * Múi giờ lịch làm việc. Phải trùng {@code app.schedule-zone-id} của staff-service
 * để quy đổi Instant sang ngày tra cứu lịch cho đúng.
 */
@Configuration
public class ScheduleTimeConfiguration {

    @Bean
    ZoneId scheduleZoneId(@Value("${app.schedule-zone-id}") String scheduleZoneId) {
        try {
            return ZoneId.of(scheduleZoneId);
        } catch (DateTimeException exception) {
            throw new IllegalStateException("app.schedule-zone-id must be a valid IANA timezone", exception);
        }
    }
}
