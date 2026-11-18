package com.example.billing_service.service;

import com.example.billing_service.entity.Invoice;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.messaging.event.InvoiceVoidedEvent;
import com.example.billing_service.messaging.event.WorkOrderCanceledEvent;
import com.example.billing_service.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class InvoiceCancellationTransaction {

    private final InvoiceRepository invoiceRepository;
    private final OutboxEventService outboxEventService;

    @Transactional
    public void cancelUnpaidInvoice(WorkOrderCanceledEvent event) {
        Invoice invoice = invoiceRepository.findByWorkOrderIdForUpdate(event.workOrderId()).orElse(null);
        if (invoice == null
                || invoice.getStatus() != InvoiceStatus.UNPAID
                || invoice.getPaidAmount().signum() != 0) {
            return;
        }

        Instant voidedAt = Instant.now();
        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setVoidedAt(voidedAt);
        invoice.setVoidReason(event.reason());
        outboxEventService.add(
                "INVOICE",
                invoice.getId(),
                "billing.invoice-voided",
                "InvoiceVoidedEvent",
                eventId -> new InvoiceVoidedEvent(
                        eventId, invoice.getId(), invoice.getWorkOrderId(), voidedAt, event.reason())
        );
    }
}
