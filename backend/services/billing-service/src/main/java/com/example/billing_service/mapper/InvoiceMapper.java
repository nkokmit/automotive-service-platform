package com.example.billing_service.mapper;

import com.example.billing_service.dto.response.InvoiceItemResponse;
import com.example.billing_service.dto.response.InvoicePageResponse;
import com.example.billing_service.dto.response.InvoiceResponse;
import com.example.billing_service.dto.response.InvoiceSummaryResponse;
import com.example.billing_service.dto.response.PaymentResponse;
import com.example.billing_service.entity.Invoice;
import com.example.billing_service.entity.InvoiceItem;
import com.example.billing_service.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InvoiceMapper {

    public InvoiceResponse toResponse(Invoice invoice) {
        return toResponse(invoice, List.of(), List.of());
    }

    public InvoiceResponse toResponse(Invoice invoice, List<InvoiceItem> items, List<Payment> payments) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getCode(),
                invoice.getWorkOrderId(),
                invoice.getCustomerId(),
                invoice.getVehicleId(),
                invoice.getSubtotalLabor(),
                invoice.getSubtotalParts(),
                invoice.getDiscountAmount(),
                invoice.getTaxAmount(),
                invoice.getGrandTotal(),
                invoice.getPaidAmount(),
                invoice.getStatus(),
                invoice.getNote(),
                invoice.getIssuedBy(),
                invoice.getIssuedAt(),
                invoice.getPaidAt(),
                invoice.getVoidedAt(),
                invoice.getVoidReason(),
                items.stream().map(this::toResponse).toList(),
                payments.stream().map(this::toResponse).toList()
        );
    }

    public InvoiceSummaryResponse toSummary(Invoice invoice) {
        return new InvoiceSummaryResponse(
                invoice.getId(),
                invoice.getCode(),
                invoice.getWorkOrderId(),
                invoice.getCustomerId(),
                invoice.getVehicleId(),
                invoice.getSubtotalLabor(),
                invoice.getSubtotalParts(),
                invoice.getDiscountAmount(),
                invoice.getTaxAmount(),
                invoice.getGrandTotal(),
                invoice.getPaidAmount(),
                invoice.getStatus(),
                invoice.getIssuedAt(),
                invoice.getPaidAt()
        );
    }

    public InvoicePageResponse toPageResponse(Page<Invoice> invoices) {
        return new InvoicePageResponse(
                invoices.getContent().stream().map(this::toSummary).toList(),
                invoices.getNumber(),
                invoices.getSize(),
                invoices.getTotalElements(),
                invoices.getTotalPages()
        );
    }

    public InvoiceItemResponse toResponse(InvoiceItem item) {
        return new InvoiceItemResponse(
                item.getId(),
                item.getItemType(),
                item.getReferenceItemId(),
                item.getCatalogId(),
                item.getSnapshotCode(),
                item.getSnapshotName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDiscountAmount(),
                item.getTaxRate(),
                item.getTotalPrice()
        );
    }

    public PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getCode(),
                payment.getInvoice().getId(),
                payment.getIdempotencyKey(),
                payment.getPaymentMethod(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getTransactionRef(),
                payment.getProcessedBy(),
                payment.getNote(),
                payment.getPaidAt(),
                payment.getRefundedAt(),
                payment.getRefundReason()
        );
    }
}
