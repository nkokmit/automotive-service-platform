package com.example.billing_service.service;

import com.example.billing_service.entity.OutboxEvent;
import com.example.billing_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

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
            Function<UUID, ?> eventFactory
    ) {
        UUID eventId = UUID.randomUUID();
        JsonNode payload = objectMapper.valueToTree(eventFactory.apply(eventId));
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
