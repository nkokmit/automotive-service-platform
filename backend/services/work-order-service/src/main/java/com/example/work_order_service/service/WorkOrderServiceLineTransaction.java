package com.example.work_order_service.service;

import com.example.work_order_service.dto.response.AssignedServiceLineResponse;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderServiceLineTransaction {

    private final WorkOrderServiceLineRepository serviceLineRepository;
    private final WorkOrderRepository workOrderRepository;

    @Transactional
    public AssignedServiceLineResponse assign(UUID serviceLineId, UUID mechanicId) {
        WorkOrderServiceLine line = findLineForUpdate(serviceLineId);
        WorkOrder workOrder = findWorkOrderForUpdate(line);
        requireWorkOrderInProgress(workOrder);
        if (line.getStatus() != WorkOrderServiceStatus.APPROVED) {
            throw invalidTransition("Chỉ có thể phân công dòng dịch vụ đã được duyệt");
        }

        line.setAssignedTechId(mechanicId);
        return toResponse(serviceLineRepository.save(line));
    }

    @Transactional(readOnly = true)
    public List<AssignedServiceLineResponse> listAssigned(
            UUID mechanicId,
            WorkOrderServiceStatus status
    ) {
        List<WorkOrderServiceLine> lines = status == null
                ? serviceLineRepository.findByAssignedTechIdOrderByCreatedAtAsc(mechanicId)
                : serviceLineRepository.findByAssignedTechIdAndStatusOrderByCreatedAtAsc(mechanicId, status);
        return lines.stream().map(this::toResponse).toList();
    }

    @Transactional
    public AssignedServiceLineResponse start(UUID serviceLineId, UUID mechanicId) {
        WorkOrderServiceLine line = findLineForUpdate(serviceLineId);
        WorkOrder workOrder = findWorkOrderForUpdate(line);
        requireAssignedMechanic(line, mechanicId);
        requireWorkOrderInProgress(workOrder);
        if (line.getStatus() != WorkOrderServiceStatus.APPROVED) {
            throw invalidTransition("Chỉ có thể bắt đầu dòng dịch vụ đã được duyệt");
        }

        line.setStatus(WorkOrderServiceStatus.IN_PROGRESS);
        return toResponse(serviceLineRepository.save(line));
    }

    @Transactional
    public AssignedServiceLineResponse complete(UUID serviceLineId, UUID mechanicId) {
        WorkOrderServiceLine line = findLineForUpdate(serviceLineId);
        WorkOrder workOrder = findWorkOrderForUpdate(line);
        requireAssignedMechanic(line, mechanicId);
        requireWorkOrderInProgress(workOrder);
        if (line.getStatus() != WorkOrderServiceStatus.IN_PROGRESS) {
            throw invalidTransition("Chỉ có thể hoàn tất dòng dịch vụ đang IN_PROGRESS");
        }

        line.setStatus(WorkOrderServiceStatus.COMPLETED);
        line.setCompletedAt(Instant.now());
        return toResponse(serviceLineRepository.save(line));
    }

    private WorkOrderServiceLine findLineForUpdate(UUID serviceLineId) {
        return serviceLineRepository.findByIdForUpdate(serviceLineId)
                .orElseThrow(() -> new ApiException(ErrorCode.SERVICE_LINE_NOT_FOUND));
    }

    private WorkOrder findWorkOrderForUpdate(WorkOrderServiceLine line) {
        return workOrderRepository.findByIdForUpdate(line.getEstimate().getWorkOrder().getId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
    }

    private void requireWorkOrderInProgress(WorkOrder workOrder) {
        if (workOrder.getStatus() != WorkOrderStatus.IN_PROGRESS) {
            throw invalidTransition("Work Order phải ở trạng thái IN_PROGRESS");
        }
    }

    private void requireAssignedMechanic(WorkOrderServiceLine line, UUID mechanicId) {
        if (!mechanicId.equals(line.getAssignedTechId())) {
            throw new ApiException(ErrorCode.UNAUTHORIZED,
                    "Chỉ mechanic được phân công mới có thể cập nhật dòng dịch vụ");
        }
    }

    private ApiException invalidTransition(String message) {
        return new ApiException(ErrorCode.INVALID_SERVICE_LINE_STATUS_TRANSITION, message);
    }

    private AssignedServiceLineResponse toResponse(WorkOrderServiceLine line) {
        var estimate = line.getEstimate();
        var workOrder = estimate.getWorkOrder();
        return new AssignedServiceLineResponse(
                line.getId(),
                estimate.getId(),
                workOrder.getId(),
                workOrder.getCode(),
                line.getServiceId(),
                line.getSnapshotName(),
                line.getDurationMinutes(),
                line.getRequiredTechs(),
                line.getUnitPrice(),
                line.getTotalPrice(),
                line.getStatus(),
                line.getAssignedTechId(),
                line.getCompletedAt(),
                line.getCreatedAt());
    }
}
