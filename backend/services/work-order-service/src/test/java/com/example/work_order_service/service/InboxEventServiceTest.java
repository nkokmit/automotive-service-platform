package com.example.work_order_service.service;

import com.example.work_order_service.repository.ProcessedEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InboxEventServiceTest {

    @Mock
    private ProcessedEventRepository processedEventRepository;

    private InboxEventService inboxEventService;

    @BeforeEach
    void setUp() {
        inboxEventService = new InboxEventService(processedEventRepository);
    }

    @Test
    void marksNewEventAsProcessed() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(processedEventRepository.insertIfAbsent(
                eventId.toString(), "parts-reserved", "PartsReservedEvent", workOrderId.toString()))
                .thenReturn(1);

        assertTrue(inboxEventService.markProcessed(
                eventId, "parts-reserved", "PartsReservedEvent", workOrderId));
    }

    @Test
    void identifiesDuplicateEvent() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        when(processedEventRepository.insertIfAbsent(
                eventId.toString(), "parts-reserved", "PartsReservedEvent", workOrderId.toString()))
                .thenReturn(0);

        assertFalse(inboxEventService.markProcessed(
                eventId, "parts-reserved", "PartsReservedEvent", workOrderId));
    }
}
