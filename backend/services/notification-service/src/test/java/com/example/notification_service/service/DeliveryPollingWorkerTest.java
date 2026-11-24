package com.example.notification_service.service;

import com.example.notification_service.entity.NotificationDelivery;
import com.example.notification_service.enums.DeliveryStatus;
import com.example.notification_service.enums.NotificationChannel;
import com.example.notification_service.exception.EmailDeliveryException;
import com.example.notification_service.repository.NotificationDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryPollingWorkerTest {

    @Mock
    private NotificationDeliveryRepository deliveryRepository;

    @Mock
    private EmailChannelSender emailChannelSender;

    private DeliveryPollingWorker worker;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        worker = new DeliveryPollingWorker(deliveryRepository, emailChannelSender);
    }

    @Test
    void marksDeliverySentAfterSuccessfulSend() {
        NotificationDelivery delivery = pendingDelivery(0);
        when(deliveryRepository.findBatchForUpdateSkipLocked(50)).thenReturn(List.of(delivery));

        worker.pollPendingDeliveries();

        assertEquals(DeliveryStatus.SENT, delivery.getStatus());
        assertNotNull(delivery.getSentAt());
        verify(emailChannelSender).send(delivery);
    }

    @Test
    void schedulesRetryAndMarksDeliveryFailedAtRetryLimit() {
        NotificationDelivery retryable = pendingDelivery(0);
        NotificationDelivery finalAttempt = pendingDelivery(4);
        when(deliveryRepository.findBatchForUpdateSkipLocked(50))
                .thenReturn(List.of(retryable, finalAttempt));
        doThrow(new EmailDeliveryException("Brevo API request failed with HTTP 503"))
                .when(emailChannelSender).send(retryable);
        doThrow(new EmailDeliveryException("Brevo API request failed with HTTP 503"))
                .when(emailChannelSender).send(finalAttempt);

        Instant before = Instant.now();
        worker.pollPendingDeliveries();
        Instant after = Instant.now();

        assertEquals(1, retryable.getRetryCount());
        assertEquals(DeliveryStatus.PENDING, retryable.getStatus());
        assertTrue(retryable.getNextRetryAt().isAfter(before.plusSeconds(19)));
        assertTrue(retryable.getNextRetryAt().isBefore(after.plusSeconds(21)));
        assertEquals(DeliveryStatus.FAILED, finalAttempt.getStatus());
        assertEquals(5, finalAttempt.getRetryCount());
        assertEquals("Brevo API request failed with HTTP 503", finalAttempt.getLastError());
    }

    @Test
    void retriesPendingDeliveryAndMarksSentWhenEmailSenderRecovers() {
        NotificationDelivery delivery = pendingDelivery(0);
        when(deliveryRepository.findBatchForUpdateSkipLocked(50))
                .thenReturn(List.of(delivery), List.of(delivery));
        doThrow(new EmailDeliveryException("Brevo API request failed with HTTP 503"))
                .doNothing()
                .when(emailChannelSender).send(delivery);

        worker.pollPendingDeliveries();

        assertEquals(DeliveryStatus.PENDING, delivery.getStatus());
        assertEquals(1, delivery.getRetryCount());
        assertNotNull(delivery.getNextRetryAt());

        worker.pollPendingDeliveries();

        assertEquals(DeliveryStatus.SENT, delivery.getStatus());
        assertEquals(1, delivery.getRetryCount());
        assertNotNull(delivery.getSentAt());
        assertNull(delivery.getLastError());
        verify(emailChannelSender, times(2)).send(delivery);
    }

    private NotificationDelivery pendingDelivery(int retryCount) {
        return NotificationDelivery.builder()
                .id(UUID.randomUUID())
                .channel(NotificationChannel.EMAIL)
                .recipientAddress("customer@example.com")
                .subject("Test email")
                .body("<p>Test</p>")
                .retryCount(retryCount)
                .status(DeliveryStatus.PENDING)
                .nextRetryAt(Instant.now())
                .build();
    }
}
