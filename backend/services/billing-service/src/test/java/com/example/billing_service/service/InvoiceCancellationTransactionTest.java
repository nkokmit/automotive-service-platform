package com.example.billing_service.service;

import com.example.billing_service.entity.Invoice;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.messaging.event.InvoiceVoidedEvent;
import com.example.billing_service.messaging.event.WorkOrderCanceledEvent;
import com.example.billing_service.repository.InvoiceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceCancellationTransactionTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private OutboxEventService outboxEventService;

    @InjectMocks
    private InvoiceCancellationTransaction transaction;

    @Test
    void voidsUnpaidInvoiceAndWritesVoidedEventToOutbox() {
        UUID workOrderId = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();
        WorkOrderCanceledEvent event =
                new WorkOrderCanceledEvent(UUID.randomUUID(), workOrderId, Instant.now(), "Canceled");
        Invoice invoice = Invoice.builder()
                .id(invoiceId)
                .workOrderId(workOrderId)
                .paidAmount(BigDecimal.ZERO)
                .status(InvoiceStatus.UNPAID)
                .build();
        when(invoiceRepository.findByWorkOrderIdForUpdate(workOrderId)).thenReturn(Optional.of(invoice));

        transaction.cancelUnpaidInvoice(event);

        assertEquals(InvoiceStatus.VOID, invoice.getStatus());
        assertEquals("Canceled", invoice.getVoidReason());
        ArgumentCaptor<Function<UUID, ?>> eventFactory = ArgumentCaptor.forClass(Function.class);
        verify(outboxEventService).add(
                eq("INVOICE"), eq(invoiceId), eq("billing.invoice-voided"),
                eq("InvoiceVoidedEvent"), eventFactory.capture());
        InvoiceVoidedEvent voidedEvent = (InvoiceVoidedEvent) eventFactory.getValue().apply(UUID.randomUUID());
        assertEquals(invoiceId, voidedEvent.invoiceId());
        assertEquals(workOrderId, voidedEvent.workOrderId());
    }

    @Test
    void leavesPartiallyPaidInvoiceUnchanged() {
        UUID workOrderId = UUID.randomUUID();
        Invoice invoice = Invoice.builder()
                .workOrderId(workOrderId)
                .paidAmount(new BigDecimal("1.00"))
                .status(InvoiceStatus.PARTIALLY_PAID)
                .build();
        when(invoiceRepository.findByWorkOrderIdForUpdate(workOrderId)).thenReturn(Optional.of(invoice));

        transaction.cancelUnpaidInvoice(
                new WorkOrderCanceledEvent(UUID.randomUUID(), workOrderId, Instant.now(), "Canceled"));

        assertEquals(InvoiceStatus.PARTIALLY_PAID, invoice.getStatus());
        verify(outboxEventService, never()).add(anyString(), any(), anyString(), anyString(), any());
    }
}
