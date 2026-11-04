package com.example.staff_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.DateTimeException;
import java.time.ZoneId;

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
