package com.example.work_order_service.service;

import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateType;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.messaging.event.PartReservationItem;
import com.example.work_order_service.messaging.event.PartsReservationFailedEvent;
import com.example.work_order_service.messaging.event.PartsReleaseRequestedEvent;
import com.example.work_order_service.messaging.event.PartsReservedEvent;
import com.example.work_order_service.messaging.producer.PartsReleaseRequestPublisher;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartsReservationResultHandlerTest {

    private final UUID workOrderId = UUID.randomUUID();
    private final UUID estimateId = UUID.randomUUID();
    private final UUID partLineId = UUID.randomUUID();
    private final UUID catalogPartId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();

    @Mock
    private EstimateRepository estimateRepository;
    @Mock
    private WorkOrderPartLineRepository partLineRepository;
    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderStatusHistoryRepository statusHistoryRepository;
    @Mock
    private PartsReleaseRequestPublisher releaseRequestPublisher;

    private PartsReservationResultHandler handler;
    private Estimate estimate;
    private WorkOrder workOrder;
    private WorkOrderPartLine partLine;

    @BeforeEach
    void setUp() {
        handler = new PartsReservationResultHandler(
                estimateRepository, partLineRepository, workOrderRepository, statusHistoryRepository,
                releaseRequestPublisher);
        workOrder = WorkOrder.builder().id(workOrderId).status(WorkOrderStatus.PENDING_APPROVAL).build();
        estimate = Estimate.builder()
                .id(estimateId)
                .workOrder(workOrder)
                .type(EstimateType.INITIAL)
                .status(EstimateStatus.APPROVED)
                .build();
        partLine = WorkOrderPartLine.builder()
                .id(partLineId)
                .estimate(estimate)
                .partId(catalogPartId)
                .requestedQuantity(2)
                .reservedQuantity(0)
                .status(WorkOrderPartStatus.APPROVED)
                .build();
        when(estimateRepository.findByIdForUpdate(estimateId)).thenReturn(Optional.of(estimate));
        lenient().when(partLineRepository.findByIdAndEstimate_Id(partLineId, estimateId))
                .thenReturn(Optional.of(partLine));
        lenient().when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.of(workOrder));
    }

    @Test
    void marksPartReservedAndMovesInitialWorkOrderToInProgress() {
        handler.handleReserved(new PartsReservedEvent(
                UUID.randomUUID(), workOrderId, estimateId, actorId, List.of(item())));

        assertEquals(WorkOrderPartStatus.RESERVED, partLine.getStatus());
        assertEquals(2, partLine.getReservedQuantity());
        assertEquals(WorkOrderStatus.IN_PROGRESS, workOrder.getStatus());
        verify(partLineRepository).save(partLine);
        verify(workOrderRepository).saveAndFlush(workOrder);
        verify(statusHistoryRepository).save(any());
    }

    @Test
    void marksPartFailedWithoutStartingWorkOrderWhenReservationFails() {
        estimate.setStatus(EstimateStatus.PARTIALLY_APPROVED);

        handler.handleFailed(new PartsReservationFailedEvent(
                UUID.randomUUID(), workOrderId, estimateId, actorId, List.of(item()), "Insufficient stock"));

        assertEquals(WorkOrderPartStatus.FAILED, partLine.getStatus());
        assertEquals(0, partLine.getReservedQuantity());
        assertEquals(WorkOrderStatus.PENDING_APPROVAL, workOrder.getStatus());
        verify(workOrderRepository, never()).saveAndFlush(any());
        verify(statusHistoryRepository, never()).save(any());
    }

    @Test
    void repeatedSuccessIsIdempotent() {
        partLine.setStatus(WorkOrderPartStatus.RESERVED);
        partLine.setReservedQuantity(2);
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);

        handler.handleReserved(new PartsReservedEvent(
                UUID.randomUUID(), workOrderId, estimateId, actorId, List.of(item())));

        verify(partLineRepository, never()).save(any());
        verify(workOrderRepository, never()).saveAndFlush(any());
        verify(statusHistoryRepository, never()).save(any());
    }

    @Test
    void releasesPartsWhenReservationCompletesAfterWorkOrderWasCanceled() {
        workOrder.setStatus(WorkOrderStatus.CANCELED);

        handler.handleReserved(new PartsReservedEvent(
                UUID.randomUUID(), workOrderId, estimateId, actorId, List.of(item())));

        verify(releaseRequestPublisher).publish(org.mockito.ArgumentMatchers.argThat(event ->
                event.workOrderId().equals(workOrderId)
                        && event.requestedBy().equals(actorId)
                        && event.parts().equals(List.of(item()))));
        verify(partLineRepository, never()).save(any());
        verify(workOrderRepository, never()).saveAndFlush(any());
    }

    private PartReservationItem item() {
        return new PartReservationItem(partLineId, catalogPartId, 2);
    }
}
