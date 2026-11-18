package com.example.billing_service.service;

import com.example.billing_service.dto.response.InvoiceResponse;
import com.example.billing_service.entity.Invoice;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.exception.ApiException;
import com.example.billing_service.exception.ErrorCode;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.messaging.event.InvoiceVoidedEvent;
import com.example.billing_service.repository.InvoiceItemRepository;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceMutationTransaction {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceMapper invoiceMapper;
    private final OutboxEventService outboxEventService;

    @Transactional
    public InvoiceResponse updateDiscount(UUID invoiceId, BigDecimal discountAmount, String note) {
        Invoice invoice = getForUpdate(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.UNPAID || invoice.getPaidAmount().signum() != 0) {
            throw new ApiException(ErrorCode.INVOICE_NOT_EDITABLE);
        }
        BigDecimal maximumDiscount = invoice.getSubtotalLabor()
                .add(invoice.getSubtotalParts())
                .add(invoice.getTaxAmount());
        if (discountAmount.signum() < 0 || discountAmount.compareTo(maximumDiscount) > 0) {
            throw new ApiException(ErrorCode.INVALID_DISCOUNT);
        }
        BigDecimal discount = discountAmount.setScale(2, RoundingMode.HALF_UP);
        invoice.setDiscountAmount(discount);
        invoice.setGrandTotal(maximumDiscount.subtract(discount).setScale(2, RoundingMode.HALF_UP));
        if (note != null) {
            invoice.setNote(note);
        }
        invoiceRepository.save(invoice);
        return detailed(invoice);
    }

    @Transactional
    public InvoiceResponse voidInvoice(UUID invoiceId, String reason) {
        Invoice invoice = getForUpdate(invoiceId);
        if (invoice.getStatus() == InvoiceStatus.VOID) {
            return detailed(invoice);
        }
        if (invoice.getPaidAmount().signum() != 0) {
            throw new ApiException(ErrorCode.INVOICE_NOT_EDITABLE);
        }
        Instant voidedAt = Instant.now();
        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setVoidedAt(voidedAt);
        invoice.setVoidReason(reason);
        invoiceRepository.save(invoice);
        outboxEventService.add(
                "INVOICE",
                invoice.getId(),
                "billing.invoice-voided",
                "InvoiceVoidedEvent",
                eventId -> new InvoiceVoidedEvent(eventId, invoice.getId(), invoice.getWorkOrderId(), voidedAt, reason)
        );
        return detailed(invoice);
    }

    private Invoice getForUpdate(UUID invoiceId) {
        return invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ApiException(ErrorCode.INVOICE_NOT_FOUND));
    }

    private InvoiceResponse detailed(Invoice invoice) {
        return invoiceMapper.toResponse(
                invoice,
                invoiceItemRepository.findAllByInvoice_Id(invoice.getId()),
                paymentRepository.findAllByInvoice_IdOrderByPaidAtAsc(invoice.getId())
        );
    }

}
