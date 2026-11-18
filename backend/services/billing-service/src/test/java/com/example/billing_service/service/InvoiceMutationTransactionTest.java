package com.example.billing_service.service;

import com.example.billing_service.entity.Invoice;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.messaging.event.InvoiceVoidedEvent;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.repository.InvoiceItemRepository;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceMutationTransactionTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceItemRepository invoiceItemRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private OutboxEventService outboxEventService;
    @Spy
    private InvoiceMapper invoiceMapper = new InvoiceMapper();

    @InjectMocks
    private InvoiceMutationTransaction transaction;

    @Test
    void discountRecalculatesGrandTotalForUnpaidInvoice() {
        Invoice invoice = invoice();
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findAllByInvoice_Id(invoice.getId())).thenReturn(java.util.List.of());
        when(paymentRepository.findAllByInvoice_IdOrderByPaidAtAsc(invoice.getId())).thenReturn(java.util.List.of());

        var response = transaction.updateDiscount(invoice.getId(), new BigDecimal("15.00"), "Promotion");

        assertEquals(new BigDecimal("85.00"), response.grandTotal());
        assertEquals(new BigDecimal("15.00"), invoice.getDiscountAmount());
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void voidingUnpaidInvoiceCreatesOutboxEventWithItsOwnId() {
        Invoice invoice = invoice();
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findAllByInvoice_Id(invoice.getId())).thenReturn(java.util.List.of());
        when(paymentRepository.findAllByInvoice_IdOrderByPaidAtAsc(invoice.getId())).thenReturn(java.util.List.of());

        transaction.voidInvoice(invoice.getId(), "Duplicate");

        assertEquals(InvoiceStatus.VOID, invoice.getStatus());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Function<UUID, ?>> factoryCaptor = ArgumentCaptor.forClass(Function.class);
        verify(outboxEventService).add(
                any(), any(), any(), any(), factoryCaptor.capture()
        );
        UUID eventId = UUID.randomUUID();
        InvoiceVoidedEvent event = (InvoiceVoidedEvent) factoryCaptor.getValue().apply(eventId);
        assertEquals(eventId, event.eventId());
        assertEquals(invoice.getId(), event.invoiceId());
    }

    private Invoice invoice() {
        return Invoice.builder()
                .id(UUID.randomUUID())
                .code("INV-TEST")
                .workOrderId(UUID.randomUUID())
                .customerId(UUID.randomUUID())
                .vehicleId(UUID.randomUUID())
                .subtotalLabor(new BigDecimal("100.00"))
                .subtotalParts(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(new BigDecimal("100.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(InvoiceStatus.UNPAID)
                .build();
    }
}
