package com.example.billing_service.service;

import com.example.billing_service.entity.OutboxEvent;
import com.example.billing_service.enums.OutboxEventStatus;
import com.example.billing_service.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxPollingService {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_RETRIES = 10;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void publishPendingEvents() {
        for (OutboxEvent event : outboxEventRepository.findBatchForUpdateSkipLocked(BATCH_SIZE)) {
            if (!publish(event)) {
                break;
            }
        }
    }

    private boolean publish(OutboxEvent event) {
        ProducerRecord<String, Object> record = new ProducerRecord<>(
                event.getTopic(), event.getAggregateId().toString(), event.getPayload());
        record.headers().add(new RecordHeader(
                "X-Event-Id", event.getId().toString().getBytes(StandardCharsets.UTF_8)));
        try {
            kafkaTemplate.send(record).get(5, TimeUnit.SECONDS);
            event.setStatus(OutboxEventStatus.SENT);
            event.setSentAt(Instant.now());
            log.info("Published outbox event {} to topic {}", event.getId(), event.getTopic());
            return true;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            recordFailure(event, exception);
            return false;
        } catch (ExecutionException | TimeoutException | KafkaException exception) {
            recordFailure(event, exception);
            return true;
        }
    }

    private void recordFailure(OutboxEvent event, Exception exception) {
        int retryCount = event.getRetryCount() + 1;
        event.setRetryCount(retryCount);
        Throwable cause = exception instanceof ExecutionException && exception.getCause() != null
                ? exception.getCause() : exception;
        String error = cause.getMessage() == null ? cause.getClass().getSimpleName() : cause.getMessage();
        event.setLastError(error);
        if (retryCount >= MAX_RETRIES) {
            event.setStatus(OutboxEventStatus.FAILED);
            log.error("Outbox event {} exhausted retries and was marked FAILED: {}",
                    event.getId(), error);
            return;
        }
        event.setNextRetryAt(Instant.now().plusSeconds(5L * (1L << retryCount)));
        log.warn("Failed to publish outbox event {} (attempt {}): {}",
                event.getId(), retryCount, error);
    }
}
