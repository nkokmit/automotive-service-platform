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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderCancellationTransactionTest {

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderPartLineRepository partLineRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;
    @Mock
    private PartsReleaseRequestPublisher releaseRequestPublisher;

    private WorkOrderCancellationTransaction transaction;

    @BeforeEach
    void setUp() {
        transaction = new WorkOrderCancellationTransaction(
                workOrderRepository, partLineRepository, historyRepository, releaseRequestPublisher);
    }

    @Test
    void cancelsCreatedWorkOrderAndRecordsHistory() {
        assertCancelledFrom(WorkOrderStatus.CREATED);
    }

    @Test
    void cancelsDiagnosingWorkOrderAndRecordsHistory() {
        assertCancelledFrom(WorkOrderStatus.DIAGNOSING);
    }

    @Test
    void cancelsPendingApprovalWorkOrderAndRecordsHistory() {
        assertCancelledFrom(WorkOrderStatus.PENDING_APPROVAL);
    }

    @Test
    void requestsReleaseForOnlyOutstandingReservations() {
        UUID workOrderId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        UUID lineId = UUID.randomUUID();
        UUID partiallyReservedPartId = UUID.randomUUID();
        UUID partiallyReservedLineId = UUID.randomUUID();
        WorkOrder workOrder = workOrder(workOrderId, WorkOrderStatus.PENDING_APPROVAL);
        WorkOrderPartLine reserved = partLine(lineId, partId, WorkOrderPartStatus.RESERVED, 5, 2, 1);
        WorkOrderPartLine partiallyReserved = partLine(
                partiallyReservedLineId, partiallyReservedPartId, WorkOrderPartStatus.PARTIALLY_RESERVED, 3, 0, 1);
        WorkOrderPartLine fullyIssued = partLine(
                UUID.randomUUID(), UUID.randomUUID(), WorkOrderPartStatus.ISSUED, 2, 2, 0);
        when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.of(workOrder));
        when(partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of(reserved, partiallyReserved, fullyIssued));

        transaction.cancel(workOrderId, actorId);

        ArgumentCaptor<PartsReleaseRequestedEvent> eventCaptor =
                ArgumentCaptor.forClass(PartsReleaseRequestedEvent.class);
        verify(releaseRequestPublisher).publish(eventCaptor.capture());
        assertEquals(workOrderId, eventCaptor.getValue().workOrderId());
        assertEquals(actorId, eventCaptor.getValue().requestedBy());
        assertEquals(List.of(
                new PartReservationItem(lineId, partId, 2),
                new PartReservationItem(partiallyReservedLineId, partiallyReservedPartId, 2)),
                eventCaptor.getValue().parts());
    }

    @Test
    void doesNotPublishReleaseRequestWhenThereAreNoReservations() {
        UUID workOrderId = UUID.randomUUID();
        when(workOrderRepository.findByIdForUpdate(workOrderId))
                .thenReturn(Optional.of(workOrder(workOrderId, WorkOrderStatus.CREATED)));
        when(partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of());

        transaction.cancel(workOrderId, UUID.randomUUID());

        verify(releaseRequestPublisher, never()).publish(any());
    }

    @Test
    void rejectsCancellationAfterWorkHasStarted() {
        UUID workOrderId = UUID.randomUUID();
        when(workOrderRepository.findByIdForUpdate(workOrderId))
                .thenReturn(Optional.of(workOrder(workOrderId, WorkOrderStatus.IN_PROGRESS)));

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.cancel(workOrderId, UUID.randomUUID()));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        verify(workOrderRepository, never()).saveAndFlush(any());
        verify(historyRepository, never()).save(any());
        verify(releaseRequestPublisher, never()).publish(any());
    }

    private void assertCancelledFrom(WorkOrderStatus initialStatus) {
        UUID workOrderId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        WorkOrder workOrder = workOrder(workOrderId, initialStatus);
        when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.of(workOrder));
        when(partLineRepository.findByEstimate_WorkOrder_IdOrderByCreatedAtAsc(workOrderId))
                .thenReturn(List.of());

        transaction.cancel(workOrderId, actorId);

        assertEquals(WorkOrderStatus.CANCELED, workOrder.getStatus());
        verify(workOrderRepository).saveAndFlush(workOrder);
        ArgumentCaptor<WorkOrderStatusHistory> historyCaptor =
                ArgumentCaptor.forClass(WorkOrderStatusHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertEquals(initialStatus.name(), historyCaptor.getValue().getStatusFrom());
        assertEquals(WorkOrderStatus.CANCELED.name(), historyCaptor.getValue().getStatusTo());
        assertEquals(actorId, historyCaptor.getValue().getChangedBy());
    }

    private WorkOrder workOrder(UUID id, WorkOrderStatus status) {
        return WorkOrder.builder().id(id).status(status).build();
    }

    private WorkOrderPartLine partLine(
            UUID id, UUID partId, WorkOrderPartStatus status, int reserved, int issued, int released
    ) {
        return WorkOrderPartLine.builder()
                .id(id)
                .partId(partId)
                .status(status)
                .reservedQuantity(reserved)
                .issuedQuantity(issued)
                .releasedQuantity(released)
                .build();
    }
}
