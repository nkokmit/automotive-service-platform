package com.example.work_order_service.service;

import com.example.work_order_service.entity.OutboxEvent;
import com.example.work_order_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class OutboxEventServiceTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    private OutboxEventService outboxEventService;

    @BeforeEach
    void setUp() {
        outboxEventService = new OutboxEventService(outboxEventRepository, new ObjectMapper());
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void storesEventInOutboxUsingPayloadEventId() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        TestEvent event = new TestEvent(eventId, workOrderId);

        outboxEventService.add("WORK_ORDER", workOrderId, "parts-reservation-requested",
                "TestEvent", eventId, event);

        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(eventCaptor.capture());
        OutboxEvent saved = eventCaptor.getValue();
        assertEquals(eventId, saved.getId());
        assertEquals(workOrderId, saved.getAggregateId());
        assertEquals(eventId.toString(), saved.getPayload().path("eventId").asText());
    }

    @Test
    void rejectsPayloadWithDifferentEventId() {
        UUID workOrderId = UUID.randomUUID();
        TestEvent event = new TestEvent(UUID.randomUUID(), workOrderId);

        assertThrows(IllegalArgumentException.class, () -> outboxEventService.add(
                "WORK_ORDER", workOrderId, "parts-reservation-requested",
                "TestEvent", UUID.randomUUID(), event));
        verifyNoInteractions(outboxEventRepository);
    }

    @Test
    void requiresAnActiveTransactionSynchronization() {
        TransactionSynchronizationManager.clearSynchronization();

        assertThrows(IllegalStateException.class, () -> outboxEventService.add(
                "WORK_ORDER", UUID.randomUUID(), "parts-reservation-requested",
                "TestEvent", UUID.randomUUID(), new TestEvent(UUID.randomUUID(), UUID.randomUUID())));
        verifyNoInteractions(outboxEventRepository);
    }

    private record TestEvent(UUID eventId, UUID workOrderId) {
    }
}
