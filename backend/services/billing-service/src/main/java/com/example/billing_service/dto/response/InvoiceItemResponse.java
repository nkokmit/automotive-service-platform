package com.example.billing_service.dto.response;

import com.example.billing_service.enums.InvoiceItemType;

import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceItemResponse(
        UUID id,
        InvoiceItemType itemType,
        UUID referenceItemId,
        UUID catalogId,
        String snapshotCode,
        String snapshotName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal taxRate,
        BigDecimal totalPrice
) {
}
