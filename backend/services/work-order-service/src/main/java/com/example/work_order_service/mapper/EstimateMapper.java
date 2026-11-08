package com.example.work_order_service.mapper;

import com.example.work_order_service.dto.response.EstimateResponse;
import com.example.work_order_service.dto.response.EstimateSummaryResponse;
import com.example.work_order_service.dto.response.WorkOrderPartLineResponse;
import com.example.work_order_service.dto.response.WorkOrderServiceLineResponse;
import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EstimateMapper {

    public EstimateResponse toResponse(
            Estimate estimate,
            List<WorkOrderServiceLine> serviceLines,
            List<WorkOrderPartLine> partLines
    ) {
        return new EstimateResponse(
                estimate.getId(),
                estimate.getCode(),
                estimate.getWorkOrder().getId(),
                estimate.getType(),
                estimate.getStatus(),
                estimate.getTotalLaborAmount(),
                estimate.getTotalPartsAmount(),
                estimate.getTotalAmount(),
                estimate.getCreatedBy(),
                estimate.getCreatedAt(),
                estimate.getUpdatedAt(),
                serviceLines.stream().map(this::toResponse).toList(),
                partLines.stream().map(this::toResponse).toList());
    }

    public EstimateSummaryResponse toSummary(Estimate estimate) {
        return new EstimateSummaryResponse(
                estimate.getId(),
                estimate.getCode(),
                estimate.getType().name(),
                estimate.getStatus().name(),
                estimate.getTotalAmount());
    }

    private WorkOrderServiceLineResponse toResponse(WorkOrderServiceLine line) {
        return new WorkOrderServiceLineResponse(
                line.getId(),
                line.getServiceId(),
                line.getSnapshotName(),
                line.getDurationMinutes(),
                line.getRequiredTechs(),
                line.getUnitPrice(),
                line.getTotalPrice(),
                line.getStatus(),
                line.getAssignedTechId(),
                line.getCreatedAt());
    }

    private WorkOrderPartLineResponse toResponse(WorkOrderPartLine line) {
        return new WorkOrderPartLineResponse(
                line.getId(),
                line.getSourceServiceLineId(),
                line.getPartId(),
                line.getSnapshotName(),
                line.getSnapshotSku(),
                line.getSnapshotUnit(),
                line.getRequestedQuantity(),
                line.getReservedQuantity(),
                line.getIssuedQuantity(),
                line.getReleasedQuantity(),
                line.getUnitPrice(),
                line.getTotalPrice(),
                line.getStatus(),
                line.getCreatedAt());
    }
}
