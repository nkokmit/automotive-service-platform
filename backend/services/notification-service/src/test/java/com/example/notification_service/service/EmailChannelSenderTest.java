package com.example.notification_service.service;

import com.example.notification_service.config.BrevoProperties;
import com.example.notification_service.entity.NotificationDelivery;
import com.example.notification_service.enums.NotificationChannel;
import com.example.notification_service.exception.EmailDeliveryException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class EmailChannelSenderTest {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Test
    void sendsHtmlEmailWithBrevoApiKey() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        EmailChannelSender sender = new EmailChannelSender(
                builder.build(),
                new BrevoProperties(BREVO_API_URL, "test-api-key", "noreply@example.com", "Garage")
        );
        NotificationDelivery delivery = NotificationDelivery.builder()
                .channel(NotificationChannel.EMAIL)
                .recipientAddress("customer@example.com")
                .subject("Booking confirmed")
                .body("<p>Your booking is confirmed.</p>")
                .build();

        server.expect(requestTo(BREVO_API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "test-api-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "sender": {"name": "Garage", "email": "noreply@example.com"},
                          "to": [{"email": "customer@example.com"}],
                          "subject": "Booking confirmed",
                          "htmlContent": "<p>Your booking is confirmed.</p>"
                        }
                        """))
                .andRespond(withSuccess());

        sender.send(delivery);

        server.verify();
    }

    @Test
    void rejectsMissingApiKeyWithoutMakingARequest() {
        EmailChannelSender sender = new EmailChannelSender(
                RestClient.builder().build(),
                new BrevoProperties(BREVO_API_URL, " ", "noreply@example.com", "Garage")
        );
        NotificationDelivery delivery = NotificationDelivery.builder()
                .recipientAddress("customer@example.com")
                .subject("Booking confirmed")
                .body("<p>Your booking is confirmed.</p>")
                .build();

        assertThrows(EmailDeliveryException.class, () -> sender.send(delivery));
    }
}
