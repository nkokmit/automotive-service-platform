package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderDiagnosisTransactionTest {

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;

    private WorkOrderDiagnosisTransaction transaction;

    @BeforeEach
    void setUp() {
        this.transaction = new WorkOrderDiagnosisTransaction(workOrderRepository, historyRepository);
    }

    @Test
    void startsDiagnosisAndRecordsStatusHistory() {
        UUID workOrderId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        WorkOrder workOrder = workOrder(workOrderId, WorkOrderStatus.CREATED);
        when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.of(workOrder));

        transaction.start(workOrderId, actorId);

        assertEquals(WorkOrderStatus.DIAGNOSING, workOrder.getStatus());
        verify(workOrderRepository).saveAndFlush(workOrder);
        ArgumentCaptor<WorkOrderStatusHistory> historyCaptor =
                ArgumentCaptor.forClass(WorkOrderStatusHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertEquals(WorkOrderStatus.CREATED.name(), historyCaptor.getValue().getStatusFrom());
        assertEquals(WorkOrderStatus.DIAGNOSING.name(), historyCaptor.getValue().getStatusTo());
        assertEquals(actorId, historyCaptor.getValue().getChangedBy());
    }

    @Test
    void rejectsDiagnosisWhenWorkOrderIsNotCreated() {
        UUID workOrderId = UUID.randomUUID();
        when(workOrderRepository.findByIdForUpdate(workOrderId))
                .thenReturn(Optional.of(workOrder(workOrderId, WorkOrderStatus.DIAGNOSING)));

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.start(workOrderId, UUID.randomUUID()));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        verify(workOrderRepository, never()).saveAndFlush(any());
        verify(historyRepository, never()).save(any());
    }

    @Test
    void reportsMissingWorkOrder() {
        UUID workOrderId = UUID.randomUUID();
        when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.start(workOrderId, UUID.randomUUID()));

        assertEquals(ErrorCode.WORK_ORDER_NOT_FOUND, exception.getErrorCode());
        verify(workOrderRepository, never()).saveAndFlush(any());
        verify(historyRepository, never()).save(any());
    }

    private WorkOrder workOrder(UUID id, WorkOrderStatus status) {
        return WorkOrder.builder()
                .id(id)
                .status(status)
                .build();
    }
}
