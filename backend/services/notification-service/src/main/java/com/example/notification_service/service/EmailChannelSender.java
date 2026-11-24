package com.example.notification_service.service;

import com.example.notification_service.config.BrevoProperties;
import com.example.notification_service.entity.NotificationDelivery;
import com.example.notification_service.exception.EmailDeliveryException;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class EmailChannelSender {

    private final RestClient restClient;
    private final BrevoProperties properties;

    public EmailChannelSender(RestClient brevoRestClient, BrevoProperties properties) {
        this.restClient = brevoRestClient;
        this.properties = properties;
    }

    public void send(NotificationDelivery delivery) {
        String apiKey = requireConfigured(properties.apiKey(), "BREVO_API_KEY");
        String senderEmail = requireConfigured(properties.senderEmail(), "BREVO_SENDER_EMAIL");
        String apiUrl = requireConfigured(properties.apiUrl(), "BREVO_API_URL");

        Map<String, Object> request = Map.of(
                "sender", Map.of(
                        "name", properties.senderName(),
                        "email", senderEmail
                ),
                "to", List.of(Map.of("email", delivery.getRecipientAddress())),
                "subject", delivery.getSubject(),
                "htmlContent", delivery.getBody()
        );

        restClient.post()
                .uri(apiUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .header("api-key", apiKey)
                .body(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (httpRequest, response) -> {
                    throw new EmailDeliveryException(
                            "Brevo API request failed with HTTP " + response.getStatusCode().value()
                    );
                })
                .toBodilessEntity();
    }

    private String requireConfigured(String value, String propertyName) {
        if (value == null || value.isBlank()) {
            throw new EmailDeliveryException(propertyName + " is not configured");
        }
        return value.trim();
    }
}
