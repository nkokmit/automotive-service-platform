package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.messaging.event.PartReservationItem;
import com.example.work_order_service.messaging.event.PartsReleaseRequestedEvent;
import com.example.work_order_service.messaging.producer.PartsReleaseRequestPublisher;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderCancellationTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderPartLineRepository partLineRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;
    private final PartsReleaseRequestPublisher releaseRequestPublisher;

    @Transactional
    public void cancel(UUID workOrderId, UUID changedBy) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        WorkOrderStatus status = workOrder.getStatus();
        if (status != WorkOrderStatus.CREATED
                && status != WorkOrderStatus.DIAGNOSING
                && status != WorkOrderStatus.PENDING_APPROVAL) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể hủy Work Order ở trạng thái CREATED, DIAGNOSING hoặc PENDING_APPROVAL");
        }

        workOrder.setStatus(WorkOrderStatus.CANCELED);
        workOrderRepository.saveAndFlush(workOrder);
        historyRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(status.name())
                .statusTo(WorkOrderStatus.CANCELED.name())
                .changedBy(changedBy)
                .note("Work Order canceled")
                .build());

        List<PartReservationItem> reservedParts =
                partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId).stream()
                        .filter(this::hasOutstandingReservation)
                        .map(line -> new PartReservationItem(
                                line.getId(),
                                line.getPartId(),
                                remainingReserved(line)))
                        .toList();
        if (!reservedParts.isEmpty()) {
            releaseRequestPublisher.publish(new PartsReleaseRequestedEvent(
                    UUID.randomUUID(), workOrderId, changedBy, reservedParts));
        }
    }

    private boolean hasOutstandingReservation(WorkOrderPartLine line) {
        return (line.getStatus() == WorkOrderPartStatus.PARTIALLY_RESERVED
                || line.getStatus() == WorkOrderPartStatus.RESERVED
                || line.getStatus() == WorkOrderPartStatus.ISSUED)
                && remainingReserved(line) > 0;
    }

    private int remainingReserved(WorkOrderPartLine line) {
        int reserved = line.getReservedQuantity() == null ? 0 : line.getReservedQuantity();
        int issued = line.getIssuedQuantity() == null ? 0 : line.getIssuedQuantity();
        int released = line.getReleasedQuantity() == null ? 0 : line.getReleasedQuantity();
        return reserved - issued - released;
    }
}
