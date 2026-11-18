package com.example.work_order_service.service;

import com.example.work_order_service.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InboxEventService {

    private final ProcessedEventRepository processedEventRepository;

    public boolean markProcessed(UUID eventId, String topic, String eventType, UUID aggregateId) {
        if (eventId == null) {
            throw new IllegalArgumentException("Kafka event must contain eventId");
        }
        return processedEventRepository.insertIfAbsent(
                eventId.toString(), topic, eventType, aggregateId == null ? null : aggregateId.toString()) == 1;
    }
}
