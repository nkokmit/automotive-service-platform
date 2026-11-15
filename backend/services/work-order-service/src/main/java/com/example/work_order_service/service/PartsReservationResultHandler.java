package com.example.work_order_service.service;

import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateType;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.messaging.event.PartReservationItem;
import com.example.work_order_service.messaging.event.PartsReservationFailedEvent;
import com.example.work_order_service.messaging.event.PartsReleaseRequestedEvent;
import com.example.work_order_service.messaging.event.PartsReservedEvent;
import com.example.work_order_service.messaging.producer.PartsReleaseRequestPublisher;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartsReservationResultHandler {

    private final EstimateRepository estimateRepository;
    private final WorkOrderPartLineRepository partLineRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStatusHistoryRepository statusHistoryRepository;
    private final PartsReleaseRequestPublisher releaseRequestPublisher;

    @Transactional
    public void handleReserved(PartsReservedEvent event) {
        Estimate estimate = findAndValidateEstimate(
                event.eventId(), event.workOrderId(), event.estimateId(), event.requestedBy(), event.parts());
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(event.workOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() == WorkOrderStatus.CANCELED) {
            releaseRequestPublisher.publish(new PartsReleaseRequestedEvent(
                    UUID.randomUUID(), event.workOrderId(), event.requestedBy(), event.parts()));
            return;
        }
        updatePartLines(estimate, event.parts(), true);
        if (estimate.getType() == EstimateType.INITIAL) {
            moveInitialWorkOrderToInProgress(estimate, event.requestedBy());
        }
    }

    @Transactional
    public void handleFailed(PartsReservationFailedEvent event) {
        Estimate estimate = findAndValidateEstimate(
                event.eventId(), event.workOrderId(), event.estimateId(), event.requestedBy(), event.parts());
        updatePartLines(estimate, event.parts(), false);
        log.warn("Inventory could not reserve parts for Estimate {}: {}",
                event.estimateId(), event.reason());
    }

    private Estimate findAndValidateEstimate(
            UUID eventId,
            UUID workOrderId,
            UUID estimateId,
            UUID requestedBy,
            List<PartReservationItem> parts
    ) {
        if (eventId == null || workOrderId == null || estimateId == null || requestedBy == null
                || parts == null || parts.isEmpty()) {
            throw new IllegalArgumentException("Reservation result is missing required data");
        }
        Estimate estimate = estimateRepository.findByIdForUpdate(estimateId)
                .orElseThrow(() -> new ApiException(ErrorCode.ESTIMATE_NOT_FOUND));
        if (!estimate.getWorkOrder().getId().equals(workOrderId)
                || (estimate.getStatus() != EstimateStatus.APPROVED
                && estimate.getStatus() != EstimateStatus.PARTIALLY_APPROVED)) {
            throw new IllegalArgumentException("Reservation result does not match an approved Estimate");
        }
        return estimate;
    }

    private void updatePartLines(Estimate estimate, List<PartReservationItem> items, boolean reserved) {
        Set<UUID> seenPartLineIds = new HashSet<>();
        for (PartReservationItem item : items) {
            if (item == null || item.workOrderPartId() == null || item.catalogPartId() == null
                    || item.quantity() == null || item.quantity() < 1
                    || !seenPartLineIds.add(item.workOrderPartId())) {
                throw new IllegalArgumentException("Reservation result contains an invalid part line");
            }
            WorkOrderPartLine line = partLineRepository
                    .findByIdAndEstimate_Id(item.workOrderPartId(), estimate.getId())
                    .orElseThrow(() -> new ApiException(ErrorCode.PART_LINE_NOT_FOUND));
            if (!line.getPartId().equals(item.catalogPartId())
                    || !line.getRequestedQuantity().equals(item.quantity())) {
                throw new IllegalArgumentException("Reservation result does not match the approved part line");
            }
            updatePartLine(line, reserved);
        }
    }

    private void updatePartLine(WorkOrderPartLine line, boolean reserved) {
        WorkOrderPartStatus targetStatus = reserved
                ? WorkOrderPartStatus.RESERVED : WorkOrderPartStatus.FAILED;
        if (line.getStatus() == targetStatus
                && (!reserved || line.getReservedQuantity().equals(line.getRequestedQuantity()))) {
            return;
        }
        if (line.getStatus() == WorkOrderPartStatus.RESERVED && !reserved) {
            log.warn("Ignoring stale reservation failure for already reserved part line {}", line.getId());
            return;
        }
        if (line.getStatus() != WorkOrderPartStatus.APPROVED) {
            throw new IllegalArgumentException("Reservation result conflicts with part line status " + line.getStatus());
        }
        line.setStatus(targetStatus);
        line.setReservedQuantity(reserved ? line.getRequestedQuantity() : 0);
        partLineRepository.save(line);
    }

    private void moveInitialWorkOrderToInProgress(Estimate estimate, UUID changedBy) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(estimate.getWorkOrder().getId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() == WorkOrderStatus.IN_PROGRESS) {
            return;
        }
        if (workOrder.getStatus() != WorkOrderStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Work Order không còn chờ reservation của Estimate ban đầu");
        }
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);
        workOrderRepository.saveAndFlush(workOrder);
        statusHistoryRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(WorkOrderStatus.PENDING_APPROVAL.name())
                .statusTo(WorkOrderStatus.IN_PROGRESS.name())
                .changedBy(changedBy)
                .note("Initial Estimate parts reserved")
                .build());
    }
}
