package com.example.work_order_service.dto.response;

import com.example.work_order_service.enums.WorkOrderPartStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WorkOrderPartLineResponse(
        UUID id,
        UUID serviceLineId,
        UUID partId,
        String snapshotName,
        String snapshotSku,
        String snapshotUnit,
        Integer requestedQuantity,
        Integer reservedQuantity,
        Integer issuedQuantity,
        Integer releasedQuantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        WorkOrderPartStatus status,
        Instant createdAt
) {
}
