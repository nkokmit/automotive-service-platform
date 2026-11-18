package com.example.billing_service.messaging.consumer;

import com.example.billing_service.messaging.event.WorkOrderCompletedEvent;
import com.example.billing_service.repository.ProcessedEventRepository;
import com.example.billing_service.service.InvoiceCancellationTransaction;
import com.example.billing_service.service.InvoiceCreationTransaction;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderEventListenerTest {

    @Mock
    private ProcessedEventRepository processedEventRepository;
    @Mock
    private InvoiceCreationTransaction invoiceCreationTransaction;
    @Mock
    private InvoiceCancellationTransaction invoiceCancellationTransaction;

    @InjectMocks
    private WorkOrderEventListener listener;

    @Test
    void duplicateCompletedEventDoesNotCreateAnotherInvoice() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        ReflectionTestUtils.setField(listener, "completedTopic", "work-order-completed");
        when(processedEventRepository.insertIfAbsent(
                eventId.toString(), "work-order-completed", "WorkOrderCompletedEvent", workOrderId.toString()))
                .thenReturn(0);

        listener.onWorkOrderCompleted(new WorkOrderCompletedEvent(
                eventId, workOrderId, UUID.randomUUID(), UUID.randomUUID(), List.of(), List.of(),
                BigDecimal.ZERO, Instant.now()));

        verify(invoiceCreationTransaction, never()).createFromCompletedEvent(
                org.mockito.ArgumentMatchers.any());
    }
}
