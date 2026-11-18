package com.example.billing_service.dto.response;

import com.example.billing_service.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceSummaryResponse(
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
        Instant issuedAt,
        Instant paidAt
) {
}
