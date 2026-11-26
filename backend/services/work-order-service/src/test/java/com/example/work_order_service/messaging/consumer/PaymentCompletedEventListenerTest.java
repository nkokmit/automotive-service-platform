package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.PaymentCompletedEvent;
import com.example.work_order_service.service.InboxEventService;
import com.example.work_order_service.service.PaymentCompletedEventHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentCompletedEventListenerTest {

    @Mock
    private InboxEventService inboxEventService;
    @Mock
    private PaymentCompletedEventHandler eventHandler;

    private PaymentCompletedEventListener listener;

    @BeforeEach
    void setUp() {
        listener = new PaymentCompletedEventListener(inboxEventService, eventHandler);
        ReflectionTestUtils.setField(listener, "topic", "billing.payment-completed");
    }

    @Test
    void duplicateInboxEventIsIgnored() {
        PaymentCompletedEvent event = event();
        when(inboxEventService.markProcessed(
                event.eventId(), "billing.payment-completed", "PaymentCompletedEvent", event.workOrderId()))
                .thenReturn(false);

        listener.onPaymentCompleted(event);

        verify(eventHandler, never()).handle(event);
    }

    @Test
    void newInboxEventIsHandled() {
        PaymentCompletedEvent event = event();
        when(inboxEventService.markProcessed(
                event.eventId(), "billing.payment-completed", "PaymentCompletedEvent", event.workOrderId()))
                .thenReturn(true);

        listener.onPaymentCompleted(event);

        verify(eventHandler).handle(event);
    }

    private PaymentCompletedEvent event() {
        return new PaymentCompletedEvent(
                UUID.randomUUID(), UUID.randomUUID(), "INV-1", UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), BigDecimal.TEN, Instant.now());
    }
}
