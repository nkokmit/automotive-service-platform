package com.example.work_order_service.dto.response;

import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EstimateResponse(
        UUID id,
        String code,
        UUID workOrderId,
        EstimateType type,
        EstimateStatus status,
        BigDecimal totalLaborAmount,
        BigDecimal totalPartsAmount,
        BigDecimal totalAmount,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt,
        List<WorkOrderServiceLineResponse> serviceLines,
        List<WorkOrderPartLineResponse> partLines
) {
    public EstimateResponse {
        serviceLines = List.copyOf(serviceLines);
        partLines = List.copyOf(partLines);
    }
}
