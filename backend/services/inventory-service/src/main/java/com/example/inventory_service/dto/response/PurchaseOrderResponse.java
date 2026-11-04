package com.example.inventory_service.dto.response;

import com.example.inventory_service.enums.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderResponse(
        UUID id,
        String code,
        UUID supplierId,
        String supplierName,
        PurchaseOrderStatus status,
        BigDecimal totalAmount,
        UUID createdBy,
        Instant receivedAt,
        String note,
        Instant createdAt,
        Instant updatedAt,
        List<PurchaseOrderItemResponse> items
) {
}
