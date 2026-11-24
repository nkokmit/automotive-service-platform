package com.example.notification_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.email.brevo")
public record BrevoProperties(
        String apiUrl,
        String apiKey,
        String senderEmail,
        String senderName
) {
}
