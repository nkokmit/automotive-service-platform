package com.example.work_order_service.dto.response;

import com.example.work_order_service.enums.WorkOrderServiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AssignedServiceLineResponse(
        UUID id,
        UUID estimateId,
        UUID workOrderId,
        String workOrderCode,
        UUID serviceId,
        String snapshotName,
        Integer durationMinutes,
        Integer requiredTechs,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        WorkOrderServiceStatus status,
        UUID assignedTechId,
        Instant completedAt,
        Instant createdAt
) {
}
