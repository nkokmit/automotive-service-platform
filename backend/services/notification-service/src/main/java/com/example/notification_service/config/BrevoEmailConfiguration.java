package com.example.notification_service.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(BrevoProperties.class)
public class BrevoEmailConfiguration {

    @Bean
    RestClient brevoRestClient() {
        return RestClient.builder().build();
    }
}
