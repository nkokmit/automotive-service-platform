package com.example.billing_service.service;

import com.example.billing_service.entity.OutboxEvent;
import com.example.billing_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OutboxEventServiceTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @InjectMocks
    private OutboxEventService outboxEventService;

    @Test
    void eventIdInPayloadMatchesOutboxPrimaryKey() {
        UUID aggregateId = UUID.randomUUID();
        outboxEventService.add(
                "INVOICE",
                aggregateId,
                "billing.invoice-voided",
                "InvoiceVoidedEvent",
                eventId -> new TestEvent(eventId, aggregateId, Instant.parse("2026-01-01T00:00:00Z"))
        );

        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(eventCaptor.capture());
        OutboxEvent event = eventCaptor.getValue();
        assertEquals(event.getId().toString(), event.getPayload().get("eventId").asText());
        assertEquals(aggregateId, event.getAggregateId());
        assertEquals("2026-01-01T00:00:00Z", event.getPayload().get("createdAt").asText());
    }

    private record TestEvent(UUID eventId, UUID invoiceId, Instant createdAt) {
    }
}
