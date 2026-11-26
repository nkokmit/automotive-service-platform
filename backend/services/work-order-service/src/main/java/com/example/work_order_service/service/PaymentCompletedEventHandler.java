package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.messaging.event.PaymentCompletedEvent;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentCompletedEventHandler {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;

    @Transactional
    public void handle(PaymentCompletedEvent event) {
        if (event == null || event.eventId() == null || event.workOrderId() == null
                || event.customerId() == null || event.paidAt() == null
                || event.paidAmount() == null || event.paidAmount().signum() <= 0) {
            throw new IllegalArgumentException("PaymentCompletedEvent is missing required data");
        }

        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(event.workOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (!workOrder.getCustomerId().equals(event.customerId())) {
            throw new IllegalArgumentException("PaymentCompletedEvent customer does not match Work Order");
        }
        if (workOrder.getStatus() == WorkOrderStatus.CLOSED) {
            return;
        }
        if (workOrder.getStatus() != WorkOrderStatus.PENDING_PAYMENT) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể đóng Work Order đang PENDING_PAYMENT");
        }

        workOrder.setStatus(WorkOrderStatus.CLOSED);
        workOrderRepository.saveAndFlush(workOrder);
        historyRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(WorkOrderStatus.PENDING_PAYMENT.name())
                .statusTo(WorkOrderStatus.CLOSED.name())
                .changedBy(event.customerId())
                .note("Payment completed; Work Order closed")
                .createdAt(event.paidAt())
                .build());
    }
}
