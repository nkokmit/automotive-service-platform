package com.example.billing_service.service;

import com.example.billing_service.dto.request.PaymentCreateRequest;
import com.example.billing_service.dto.response.PaymentResponse;
import com.example.billing_service.entity.Invoice;
import com.example.billing_service.entity.Payment;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.enums.PaymentStatus;
import com.example.billing_service.exception.ApiException;
import com.example.billing_service.exception.ErrorCode;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.messaging.event.PaymentCompletedEvent;
import com.example.billing_service.messaging.event.PaymentRefundedEvent;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentTransaction {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceMapper invoiceMapper;
    private final OutboxEventService outboxEventService;

    @Transactional
    public PaymentResponse record(PaymentCreateRequest request, UUID processedBy) {
        Payment existing = paymentRepository.findByIdempotencyKey(request.idempotencyKey().toString()).orElse(null);
        if (existing != null) {
            return invoiceMapper.toResponse(existing);
        }

        Invoice invoice = invoiceRepository.findByIdForUpdate(request.invoiceId())
                .orElseThrow(() -> new ApiException(ErrorCode.INVOICE_NOT_FOUND));
        existing = paymentRepository.findByIdempotencyKey(request.idempotencyKey().toString()).orElse(null);
        if (existing != null) {
            return invoiceMapper.toResponse(existing);
        }
        if (invoice.getStatus() != InvoiceStatus.UNPAID && invoice.getStatus() != InvoiceStatus.PARTIALLY_PAID) {
            throw new ApiException(ErrorCode.INVOICE_NOT_EDITABLE, "Hóa đơn không ở trạng thái nhận thanh toán");
        }
        if (request.amount().signum() <= 0) {
            throw new ApiException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }
        BigDecimal newPaidAmount = invoice.getPaidAmount().add(request.amount());
        if (newPaidAmount.compareTo(invoice.getGrandTotal()) > 0) {
            throw new ApiException(ErrorCode.PAYMENT_EXCEEDS_BALANCE);
        }

        Payment payment = paymentRepository.save(Payment.builder()
                .code("PAY-" + UUID.randomUUID())
                .invoice(invoice)
                .idempotencyKey(request.idempotencyKey().toString())
                .paymentMethod(request.paymentMethod())
                .amount(request.amount())
                .status(PaymentStatus.SUCCEEDED)
                .transactionRef(request.transactionRef())
                .processedBy(processedBy)
                .note(request.note())
                .build());
        invoice.setPaidAmount(newPaidAmount);
        if (newPaidAmount.compareTo(invoice.getGrandTotal()) == 0) {
            Instant paidAt = Instant.now();
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(paidAt);
            outboxEventService.add(
                    "WORK_ORDER",
                    invoice.getWorkOrderId(),
                    "billing.payment-completed",
                    "PaymentCompletedEvent",
                    eventId -> new PaymentCompletedEvent(
                            eventId,
                            invoice.getId(),
                            invoice.getCode(),
                            invoice.getWorkOrderId(),
                            invoice.getCustomerId(),
                            invoice.getVehicleId(),
                            newPaidAmount,
                            paidAt)
            );
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }
        invoiceRepository.save(invoice);
        return invoiceMapper.toResponse(payment);
    }

    @Transactional
    public PaymentResponse refund(UUID paymentId, String reason) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ApiException(ErrorCode.PAYMENT_NOT_FOUND));
        Invoice invoice = invoiceRepository.findByIdForUpdate(payment.getInvoice().getId())
                .orElseThrow(() -> new ApiException(ErrorCode.INVOICE_NOT_FOUND));
        if (payment.getStatus() != PaymentStatus.SUCCEEDED) {
            throw new ApiException(ErrorCode.PAYMENT_NOT_REFUNDABLE);
        }
        Instant refundedAt = Instant.now();
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(refundedAt);
        payment.setRefundReason(reason);
        invoice.setPaidAmount(invoice.getPaidAmount().subtract(payment.getAmount()));
        invoice.setStatus(invoice.getPaidAmount().signum() == 0
                ? InvoiceStatus.UNPAID
                : InvoiceStatus.PARTIALLY_PAID);
        invoice.setPaidAt(null);
        paymentRepository.save(payment);
        invoiceRepository.save(invoice);

        outboxEventService.add(
                "WORK_ORDER",
                invoice.getWorkOrderId(),
                "billing.payment-refunded",
                "PaymentRefundedEvent",
                eventId -> new PaymentRefundedEvent(
                        eventId, payment.getId(), invoice.getId(), invoice.getWorkOrderId(),
                        payment.getAmount(), refundedAt, reason)
        );
        return invoiceMapper.toResponse(payment);
    }

}
