package com.example.work_order_service.service;

import com.example.work_order_service.entity.OutboxEvent;
import com.example.work_order_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OutboxEventService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public void add(
            String aggregateType,
            UUID aggregateId,
            String topic,
            String eventType,
            UUID eventId,
            Object event
    ) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Outbox events must be added within a transaction");
        }
        if (aggregateType == null || aggregateId == null || topic == null || eventType == null
                || eventId == null || event == null) {
            throw new IllegalArgumentException("Outbox event metadata and payload are required");
        }

        JsonNode payload = objectMapper.valueToTree(event);
        if (!eventId.toString().equals(payload.path("eventId").asText())) {
            throw new IllegalArgumentException("Outbox event ID must match the event payload");
        }

        outboxEventRepository.save(OutboxEvent.builder()
                .id(eventId)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .topic(topic)
                .eventType(eventType)
                .payload(payload)
                .nextRetryAt(Instant.now())
                .build());
    }
}
