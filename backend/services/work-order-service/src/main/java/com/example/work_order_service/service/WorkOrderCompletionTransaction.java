package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.messaging.event.WorkOrderCompletedEvent;
import com.example.work_order_service.messaging.event.WorkOrderCompletedPartItem;
import com.example.work_order_service.messaging.event.WorkOrderCompletedServiceItem;
import com.example.work_order_service.messaging.producer.WorkOrderCompletedEventPublisher;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderCompletionTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderServiceLineRepository serviceLineRepository;
    private final WorkOrderPartLineRepository partLineRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;
    private final WorkOrderPartTransaction partTransaction;
    private final WorkOrderCompletedEventPublisher eventPublisher;

    @Transactional
    public void complete(UUID workOrderId, UUID changedBy) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() != WorkOrderStatus.IN_PROGRESS) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể hoàn thành Work Order đang IN_PROGRESS");
        }

        List<WorkOrderServiceLine> serviceLines =
                serviceLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId);
        if (serviceLines.stream().anyMatch(line -> line.getStatus() != WorkOrderServiceStatus.COMPLETED
                && line.getStatus() != WorkOrderServiceStatus.REJECTED)) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Tất cả Service Line cần thực hiện phải COMPLETED");
        }

        List<WorkOrderPartLine> partLines =
                partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId);
        if (partLines.stream().anyMatch(line -> line.getStatus() == WorkOrderPartStatus.PENDING
                || line.getStatus() == WorkOrderPartStatus.APPROVED)) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Các Part Line phải được quyết định và xử lý reservation trước khi hoàn thành");
        }

        Instant completedAt = Instant.now();
        workOrder.setStatus(WorkOrderStatus.COMPLETED);
        workOrderRepository.saveAndFlush(workOrder);
        historyRepository.save(statusHistory(
                workOrder, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED, changedBy,
                "Work Order repair completed"));

        partTransaction.releaseOutstandingParts(workOrderId, changedBy);

        workOrder.setStatus(WorkOrderStatus.PENDING_PAYMENT);
        workOrderRepository.saveAndFlush(workOrder);
        historyRepository.save(statusHistory(
                workOrder, WorkOrderStatus.COMPLETED, WorkOrderStatus.PENDING_PAYMENT, changedBy,
                "Work Order ready for billing"));

        List<WorkOrderCompletedServiceItem> completedServices = serviceLines.stream()
                .filter(line -> line.getStatus() == WorkOrderServiceStatus.COMPLETED)
                .map(this::toCompletedServiceItem)
                .toList();
        List<WorkOrderCompletedPartItem> issuedParts = partLines.stream()
                .filter(line -> line.getIssuedQuantity() != null && line.getIssuedQuantity() > 0)
                .map(this::toCompletedPartItem)
                .toList();
        BigDecimal totalAmount = completedServices.stream()
                .map(WorkOrderCompletedServiceItem::totalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(issuedParts.stream()
                        .map(WorkOrderCompletedPartItem::totalPrice)
                        .reduce(BigDecimal.ZERO, BigDecimal::add));

        eventPublisher.publish(new WorkOrderCompletedEvent(
                UUID.randomUUID(),
                workOrder.getId(),
                workOrder.getCustomerId(),
                workOrder.getVehicleId(),
                completedServices,
                issuedParts,
                totalAmount,
                completedAt));
    }

    private WorkOrderStatusHistory statusHistory(
            WorkOrder workOrder,
            WorkOrderStatus from,
            WorkOrderStatus to,
            UUID changedBy,
            String note
    ) {
        return WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(from.name())
                .statusTo(to.name())
                .changedBy(changedBy)
                .note(note)
                .build();
    }

    private WorkOrderCompletedServiceItem toCompletedServiceItem(WorkOrderServiceLine line) {
        return new WorkOrderCompletedServiceItem(
                line.getId(),
                line.getServiceId(),
                line.getSnapshotName(),
                line.getUnitPrice(),
                line.getTotalPrice());
    }

    private WorkOrderCompletedPartItem toCompletedPartItem(WorkOrderPartLine line) {
        int quantity = line.getIssuedQuantity();
        return new WorkOrderCompletedPartItem(
                line.getId(),
                line.getPartId(),
                line.getSnapshotName(),
                line.getSnapshotSku(),
                line.getSnapshotUnit(),
                quantity,
                line.getUnitPrice(),
                line.getUnitPrice().multiply(BigDecimal.valueOf(quantity)));
    }
}
