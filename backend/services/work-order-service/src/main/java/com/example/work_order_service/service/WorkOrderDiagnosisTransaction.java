package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderDiagnosisTransaction {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;

    @Transactional
    public void start(UUID workOrderId, UUID changedBy) {
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (workOrder.getStatus() != WorkOrderStatus.CREATED) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể bắt đầu chẩn đoán Work Order ở trạng thái CREATED");
        }

        workOrder.setStatus(WorkOrderStatus.DIAGNOSING);
        workOrderRepository.saveAndFlush(workOrder);
        historyRepository.save(WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .statusFrom(WorkOrderStatus.CREATED.name())
                .statusTo(WorkOrderStatus.DIAGNOSING.name())
                .changedBy(changedBy)
                .note("Diagnosis started")
                .build());
    }
}
