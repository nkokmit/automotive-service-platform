package com.example.billing_service.service;

import com.example.billing_service.dto.request.PaymentCreateRequest;
import com.example.billing_service.entity.Invoice;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.enums.PaymentMethod;
import com.example.billing_service.exception.ApiException;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.messaging.event.PaymentCompletedEvent;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentTransactionTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private OutboxEventService outboxEventService;
    @Spy
    private InvoiceMapper invoiceMapper = new InvoiceMapper();

    @InjectMocks
    private PaymentTransaction transaction;

    @Test
    void completingBalanceSetsPaidAndAddsOutboxEvent() {
        Invoice invoice = invoice(new BigDecimal("100.00"), new BigDecimal("60.00"));
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(paymentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        doAnswer(invocation -> {
            Function<UUID, ?> eventFactory = invocation.getArgument(4);
            PaymentCompletedEvent event = (PaymentCompletedEvent) eventFactory.apply(UUID.randomUUID());
            assertEquals(invoice.getId(), event.invoiceId());
            assertEquals(invoice.getCode(), event.invoiceCode());
            assertEquals(invoice.getCustomerId(), event.customerId());
            assertEquals(invoice.getVehicleId(), event.vehicleId());
            return null;
        }).when(outboxEventService).add(
                eq("WORK_ORDER"), eq(invoice.getWorkOrderId()), eq("billing.payment-completed"),
                eq("PaymentCompletedEvent"), any()
        );

        transaction.record(
                new PaymentCreateRequest(invoice.getId(), UUID.randomUUID(), PaymentMethod.CASH,
                        new BigDecimal("40.00"), null, null),
                UUID.randomUUID()
        );

        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        assertEquals(new BigDecimal("100.00"), invoice.getPaidAmount());
        verify(outboxEventService).add(
                eq("WORK_ORDER"), eq(invoice.getWorkOrderId()), eq("billing.payment-completed"),
                eq("PaymentCompletedEvent"), any()
        );
    }

    @Test
    void rejectsPaymentGreaterThanOutstandingBalance() {
        Invoice invoice = invoice(new BigDecimal("100.00"), new BigDecimal("75.00"));
        when(invoiceRepository.findByIdForUpdate(invoice.getId())).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());

        assertThrows(ApiException.class, () -> transaction.record(
                new PaymentCreateRequest(invoice.getId(), UUID.randomUUID(), PaymentMethod.CASH,
                        new BigDecimal("30.00"), null, null),
                UUID.randomUUID()
        ));

        verify(paymentRepository, never()).save(any());
    }

    private Invoice invoice(BigDecimal grandTotal, BigDecimal paidAmount) {
        return Invoice.builder()
                .id(UUID.randomUUID())
                .code("INV-" + UUID.randomUUID())
                .workOrderId(UUID.randomUUID())
                .customerId(UUID.randomUUID())
                .vehicleId(UUID.randomUUID())
                .subtotalLabor(grandTotal)
                .subtotalParts(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(grandTotal)
                .paidAmount(paidAmount)
                .status(paidAmount.signum() == 0 ? InvoiceStatus.UNPAID : InvoiceStatus.PARTIALLY_PAID)
                .build();
    }
}
