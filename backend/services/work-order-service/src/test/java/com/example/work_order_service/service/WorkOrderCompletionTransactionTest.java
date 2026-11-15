package com.example.work_order_service.service;

import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.messaging.event.WorkOrderCompletedEvent;
import com.example.work_order_service.messaging.producer.WorkOrderCompletedEventPublisher;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderCompletionTransactionTest {

    private final UUID workOrderId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID vehicleId = UUID.randomUUID();

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderServiceLineRepository serviceLineRepository;
    @Mock
    private WorkOrderPartLineRepository partLineRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;
    @Mock
    private WorkOrderPartTransaction partTransaction;
    @Mock
    private WorkOrderCompletedEventPublisher eventPublisher;

    private WorkOrder workOrder;
    private WorkOrderCompletionTransaction transaction;

    @BeforeEach
    void setUp() {
        transaction = new WorkOrderCompletionTransaction(
                workOrderRepository,
                serviceLineRepository,
                partLineRepository,
                historyRepository,
                partTransaction,
                eventPublisher);
        workOrder = WorkOrder.builder()
                .id(workOrderId)
                .customerId(customerId)
                .vehicleId(vehicleId)
                .status(WorkOrderStatus.IN_PROGRESS)
                .build();
        when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.of(workOrder));
    }

    @Test
    void completesWorkOrderReleasesUnusedPartsAndPublishesPriceSnapshots() {
        UUID serviceId = UUID.randomUUID();
        WorkOrderServiceLine completedService = WorkOrderServiceLine.builder()
                .id(UUID.randomUUID())
                .serviceId(serviceId)
                .snapshotName("Brake repair")
                .unitPrice(BigDecimal.valueOf(100))
                .totalPrice(BigDecimal.valueOf(100))
                .status(WorkOrderServiceStatus.COMPLETED)
                .build();
        WorkOrderServiceLine rejectedService = WorkOrderServiceLine.builder()
                .status(WorkOrderServiceStatus.REJECTED)
                .build();
        WorkOrderPartLine usedPart = WorkOrderPartLine.builder()
                .id(UUID.randomUUID())
                .partId(UUID.randomUUID())
                .snapshotName("Brake pad")
                .snapshotSku("BRK-01")
                .snapshotUnit("EA")
                .reservedQuantity(3)
                .issuedQuantity(1)
                .releasedQuantity(0)
                .unitPrice(BigDecimal.valueOf(20))
                .status(WorkOrderPartStatus.RESERVED)
                .estimate(Estimate.builder().status(EstimateStatus.APPROVED).build())
                .build();
        when(serviceLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of(completedService, rejectedService));
        when(partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of(usedPart));

        transaction.complete(workOrderId, actorId);

        assertEquals(WorkOrderStatus.PENDING_PAYMENT, workOrder.getStatus());
        verify(workOrderRepository, times(2)).saveAndFlush(workOrder);
        verify(partTransaction).releaseOutstandingParts(workOrderId, actorId);

        ArgumentCaptor<WorkOrderStatusHistory> historyCaptor =
                ArgumentCaptor.forClass(WorkOrderStatusHistory.class);
        verify(historyRepository, times(2)).save(historyCaptor.capture());
        assertEquals(List.of("COMPLETED", "PENDING_PAYMENT"),
                historyCaptor.getAllValues().stream().map(WorkOrderStatusHistory::getStatusTo).toList());
        assertEquals(List.of("IN_PROGRESS", "COMPLETED"),
                historyCaptor.getAllValues().stream().map(WorkOrderStatusHistory::getStatusFrom).toList());

        ArgumentCaptor<WorkOrderCompletedEvent> eventCaptor =
                ArgumentCaptor.forClass(WorkOrderCompletedEvent.class);
        verify(eventPublisher).publish(eventCaptor.capture());
        WorkOrderCompletedEvent event = eventCaptor.getValue();
        assertEquals(workOrderId, event.workOrderId());
        assertEquals(customerId, event.customerId());
        assertEquals(vehicleId, event.vehicleId());
        assertEquals(1, event.services().size());
        assertEquals(serviceId, event.services().get(0).serviceId());
        assertEquals(1, event.parts().size());
        assertEquals(1, event.parts().get(0).quantity());
        assertEquals(BigDecimal.valueOf(20), event.parts().get(0).totalPrice());
        assertEquals(BigDecimal.valueOf(120), event.totalAmount());
    }

    @Test
    void rejectsCompletionWhileServiceLineIsNotCompletedOrRejected() {
        when(serviceLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of(WorkOrderServiceLine.builder()
                        .status(WorkOrderServiceStatus.IN_PROGRESS)
                        .build()));

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.complete(workOrderId, actorId));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        assertEquals(WorkOrderStatus.IN_PROGRESS, workOrder.getStatus());
        verify(partLineRepository, never()).findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId);
        verify(partTransaction, never()).releaseOutstandingParts(any(), any());
        verify(historyRepository, never()).save(any());
        verify(eventPublisher, never()).publish(any());
    }

    @Test
    void rejectsCompletionWhilePartDecisionOrReservationIsPending() {
        when(serviceLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of(WorkOrderServiceLine.builder()
                        .status(WorkOrderServiceStatus.COMPLETED)
                        .build()));
        when(partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of(WorkOrderPartLine.builder()
                        .status(WorkOrderPartStatus.APPROVED)
                        .build()));

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.complete(workOrderId, actorId));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        verify(partTransaction, never()).releaseOutstandingParts(any(), any());
        verify(historyRepository, never()).save(any());
        verify(eventPublisher, never()).publish(any());
    }

    @Test
    void rejectsCompletionOutsideInProgress() {
        workOrder.setStatus(WorkOrderStatus.COMPLETED);

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.complete(workOrderId, actorId));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        verify(serviceLineRepository, never()).findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(any());
        verify(partTransaction, never()).releaseOutstandingParts(any(), any());
        verify(eventPublisher, never()).publish(any());
    }
}
