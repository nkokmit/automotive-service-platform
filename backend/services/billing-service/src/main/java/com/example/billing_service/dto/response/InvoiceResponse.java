package com.example.billing_service.dto.response;

import com.example.billing_service.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        String code,
        UUID workOrderId,
        UUID customerId,
        UUID vehicleId,
        BigDecimal subtotalLabor,
        BigDecimal subtotalParts,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal grandTotal,
        BigDecimal paidAmount,
        InvoiceStatus status,
        String note,
        UUID issuedBy,
        Instant issuedAt,
        Instant paidAt,
        Instant voidedAt,
        String voidReason,
        List<InvoiceItemResponse> items,
        List<PaymentResponse> payments
) {
    public InvoiceResponse {
        items = List.copyOf(items);
        payments = List.copyOf(payments);
    }
}
