package com.example.billing_service.service;

import com.example.billing_service.entity.OutboxEvent;
import com.example.billing_service.enums.OutboxEventStatus;
import com.example.billing_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutboxPollingServiceTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;
    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private OutboxPollingService service;

    @Test
    void publishesOutboxEventWithPartitionKeyAndEventIdHeader() {
        OutboxEvent event = pendingEvent(0);
        when(outboxEventRepository.findBatchForUpdateSkipLocked(anyInt())).thenReturn(List.of(event));
        when(kafkaTemplate.send(org.mockito.ArgumentMatchers.<ProducerRecord<String, Object>>any()))
                .thenReturn(CompletableFuture.<SendResult<String, Object>>completedFuture(null));

        service.publishPendingEvents();

        ArgumentCaptor<ProducerRecord<String, Object>> recordCaptor =
                ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(recordCaptor.capture());
        ProducerRecord<String, Object> record = recordCaptor.getValue();
        assertEquals(event.getTopic(), record.topic());
        assertEquals(event.getAggregateId().toString(), record.key());
        assertEquals(event.getId().toString(),
                new String(record.headers().lastHeader("X-Event-Id").value(), java.nio.charset.StandardCharsets.UTF_8));
        assertEquals(OutboxEventStatus.SENT, event.getStatus());
        assertNotNull(event.getSentAt());
    }

    @Test
    void recordsRetryAndBackoffWhenKafkaSendFails() {
        OutboxEvent event = pendingEvent(0);
        when(outboxEventRepository.findBatchForUpdateSkipLocked(anyInt())).thenReturn(List.of(event));
        Instant attemptStarted = Instant.now();
        when(kafkaTemplate.send(org.mockito.ArgumentMatchers.<ProducerRecord<String, Object>>any()))
                .thenReturn(CompletableFuture.failedFuture(
                new IllegalStateException("broker unavailable")));

        service.publishPendingEvents();

        assertEquals(OutboxEventStatus.PENDING, event.getStatus());
        assertEquals(1, event.getRetryCount());
        assertEquals("broker unavailable", event.getLastError());
        assertFalse(event.getNextRetryAt().isBefore(attemptStarted.plusSeconds(10)));
        assertFalse(event.getNextRetryAt().isAfter(Instant.now().plusSeconds(10)));
        verify(outboxEventRepository).findBatchForUpdateSkipLocked(50);
    }

    @Test
    void marksEventFailedAfterTenthUnsuccessfulAttempt() {
        OutboxEvent event = pendingEvent(9);
        when(outboxEventRepository.findBatchForUpdateSkipLocked(anyInt())).thenReturn(List.of(event));
        when(kafkaTemplate.send(org.mockito.ArgumentMatchers.<ProducerRecord<String, Object>>any()))
                .thenReturn(CompletableFuture.failedFuture(
                        new IllegalStateException("broker unavailable")));

        service.publishPendingEvents();

        assertEquals(OutboxEventStatus.FAILED, event.getStatus());
        assertEquals(10, event.getRetryCount());
    }

    private OutboxEvent pendingEvent(int retries) {
        return OutboxEvent.builder()
                .id(UUID.randomUUID())
                .aggregateType("INVOICE")
                .aggregateId(UUID.randomUUID())
                .topic("billing.payment-completed")
                .eventType("PaymentCompletedEvent")
                .payload(new ObjectMapper().createObjectNode().put("eventId", UUID.randomUUID().toString()))
                .status(OutboxEventStatus.PENDING)
                .retryCount(retries)
                .nextRetryAt(Instant.now())
                .createdAt(Instant.now())
                .build();
    }
}
