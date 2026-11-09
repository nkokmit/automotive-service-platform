package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.dto.request.AddPartToEstimateRequest;
import com.example.work_order_service.dto.request.EstimateDecisionRequest;
import com.example.work_order_service.dto.request.EstimateItemDecisionRequest;
import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateItemDecision;
import com.example.work_order_service.enums.EstimateItemType;
import com.example.work_order_service.enums.EstimateType;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.ServiceEstimateCatalog;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.integration.contract.InternalPartCatalogContract;
import com.example.work_order_service.mapper.EstimateMapper;
import com.example.work_order_service.messaging.event.PartsReservationRequestedEvent;
import com.example.work_order_service.messaging.producer.PartsReservationRequestPublisher;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstimateTransactionTest {

    private static final UUID ESTIMATE_ID = UUID.randomUUID();

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private EstimateRepository estimateRepository;
    @Mock
    private WorkOrderServiceLineRepository serviceLineRepository;
    @Mock
    private WorkOrderPartLineRepository partLineRepository;
    @Mock
    private WorkOrderStatusHistoryRepository statusHistoryRepository;
    @Mock
    private PartsReservationRequestPublisher reservationRequestPublisher;

    private EstimateTransaction transaction;
    private Estimate estimate;
    private List<WorkOrderServiceLine> serviceLines;
    private List<WorkOrderPartLine> partLines;

    @BeforeEach
    void setUp() {
        transaction = new EstimateTransaction(
                workOrderRepository,
                statusHistoryRepository,
                estimateRepository,
                serviceLineRepository,
                partLineRepository,
                new EstimateMapper(),
                reservationRequestPublisher);
        estimate = Estimate.builder()
                .id(ESTIMATE_ID)
                .code("EST-" + ESTIMATE_ID)
                .workOrder(WorkOrder.builder().id(UUID.randomUUID()).build())
                .type(EstimateType.INITIAL)
                .status(EstimateStatus.DRAFT)
                .totalLaborAmount(BigDecimal.ZERO)
                .totalPartsAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();
        lenient().when(workOrderRepository.findByIdForUpdate(estimate.getWorkOrder().getId()))
                .thenReturn(Optional.of(estimate.getWorkOrder()));
        serviceLines = new ArrayList<>();
        partLines = new ArrayList<>();
        when(estimateRepository.findByIdForUpdate(ESTIMATE_ID)).thenReturn(Optional.of(estimate));
        lenient().when(serviceLineRepository.saveAndFlush(any(WorkOrderServiceLine.class))).thenAnswer(invocation -> {
            WorkOrderServiceLine line = invocation.getArgument(0);
            line.setId(UUID.randomUUID());
            serviceLines.add(line);
            return line;
        });
        lenient().when(serviceLineRepository.findByEstimate_IdOrderByCreatedAtAsc(ESTIMATE_ID))
                .thenAnswer(invocation -> List.copyOf(serviceLines));
        lenient().when(partLineRepository.saveAll(any())).thenAnswer(invocation -> {
            List<WorkOrderPartLine> lines = invocation.getArgument(0);
            partLines.addAll(lines);
            return lines;
        });
        lenient().when(partLineRepository.saveAndFlush(any(WorkOrderPartLine.class))).thenAnswer(invocation -> {
            WorkOrderPartLine line = invocation.getArgument(0);
            line.setId(UUID.randomUUID());
            partLines.add(line);
            return line;
        });
        lenient().when(partLineRepository.findByEstimate_IdOrderByCreatedAtAsc(ESTIMATE_ID))
                .thenAnswer(invocation -> List.copyOf(partLines));
        lenient().when(estimateRepository.save(any(Estimate.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void addsOneServiceAndUsesDefaultBomQuantityAndTotals() {
        UUID serviceId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        ServiceEstimateCatalog catalog = new ServiceEstimateCatalog(
                new InternalServiceCatalogContract(serviceId, "Oil change", 30, 1,
                        BigDecimal.valueOf(250), true),
                List.of(new InternalServiceBomContract(partId, "OIL-1", "Engine oil", "L", 2,
                        BigDecimal.valueOf(40), true)));

        var result = transaction.addService(ESTIMATE_ID, new AddServiceToEstimateRequest(serviceId), catalog);

        assertEquals(EstimateStatus.DRAFT, result.status());
        assertEquals(BigDecimal.valueOf(250), result.totalLaborAmount());
        assertEquals(BigDecimal.valueOf(80), result.totalPartsAmount());
        assertEquals(BigDecimal.valueOf(330), result.totalAmount());
        assertEquals(WorkOrderServiceStatus.PENDING, result.serviceLines().get(0).status());
        assertEquals(partId, result.partLines().get(0).partId());
        assertEquals(2, result.partLines().get(0).requestedQuantity());
        assertEquals("L", result.partLines().get(0).snapshotUnit());
        assertEquals(WorkOrderPartStatus.PENDING, result.partLines().get(0).status());
    }

    @Test
    void removesBOMLinesButPreservesManuallyAddedParts() {
        UUID serviceLineId = UUID.randomUUID();
        WorkOrderServiceLine serviceLine = WorkOrderServiceLine.builder()
                .id(serviceLineId)
                .estimate(estimate)
                .totalPrice(BigDecimal.valueOf(100))
                .build();
        serviceLines.add(serviceLine);
        WorkOrderPartLine bomPart = WorkOrderPartLine.builder()
                .estimate(estimate)
                .sourceServiceLineId(serviceLineId)
                .totalPrice(BigDecimal.valueOf(40))
                .build();
        WorkOrderPartLine manualPart = WorkOrderPartLine.builder()
                .estimate(estimate)
                .totalPrice(BigDecimal.valueOf(15))
                .build();
        partLines.addAll(List.of(bomPart, manualPart));
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);
        when(serviceLineRepository.findByIdAndEstimate_Id(serviceLineId, ESTIMATE_ID))
                .thenReturn(Optional.of(serviceLine));
        doAnswer(invocation -> {
            partLines.removeIf(line -> serviceLineId.equals(line.getSourceServiceLineId()));
            return null;
        }).when(partLineRepository).deleteBySourceServiceLineId(serviceLineId);
        doAnswer(invocation -> {
            serviceLines.remove(serviceLine);
            return null;
        }).when(serviceLineRepository).delete(serviceLine);

        transaction.removeService(ESTIMATE_ID, serviceLineId);

        assertEquals(0, estimate.getTotalLaborAmount().compareTo(BigDecimal.ZERO));
        assertEquals(0, estimate.getTotalPartsAmount().compareTo(BigDecimal.valueOf(15)));
        assertEquals(1, partLines.size());
        assertEquals(manualPart, partLines.get(0));
        verify(partLineRepository).deleteBySourceServiceLineId(serviceLineId);
    }

    @Test
    void rejectsAddingServiceAfterEstimateWasSubmitted() {
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.addService(ESTIMATE_ID,
                        new AddServiceToEstimateRequest(UUID.randomUUID()),
                        new ServiceEstimateCatalog(
                                new InternalServiceCatalogContract(UUID.randomUUID(), "Service", 1, 1,
                                        BigDecimal.ZERO, true),
                                List.of())));

        assertEquals(ErrorCode.ESTIMATE_NOT_EDITABLE, exception.getErrorCode());
        verify(serviceLineRepository, never()).saveAndFlush(any());
    }

    @Test
    void addsManualPartWithCatalogSnapshotAndRecalculatesTotals() {
        UUID partId = UUID.randomUUID();
        InternalPartCatalogContract part = new InternalPartCatalogContract(
                partId, "FILTER-1", "Oil filter", "pcs", BigDecimal.valueOf(25), true);

        var result = transaction.addPart(
                ESTIMATE_ID, new AddPartToEstimateRequest(partId, 3), part);

        assertEquals(EstimateStatus.DRAFT, result.status());
        assertEquals(BigDecimal.valueOf(75), result.totalPartsAmount());
        assertEquals(BigDecimal.valueOf(75), result.totalAmount());
        assertEquals(1, result.partLines().size());
        assertEquals(partId, result.partLines().get(0).partId());
        assertEquals("FILTER-1", result.partLines().get(0).snapshotSku());
        assertEquals("Oil filter", result.partLines().get(0).snapshotName());
        assertEquals(3, result.partLines().get(0).requestedQuantity());
        assertEquals(WorkOrderPartStatus.PENDING, result.partLines().get(0).status());
    }

    @Test
    void removesPartBeforeFinalDecisionAndRecalculatesTotals() {
        UUID partLineId = UUID.randomUUID();
        WorkOrderPartLine partLine = WorkOrderPartLine.builder()
                .id(partLineId)
                .estimate(estimate)
                .totalPrice(BigDecimal.valueOf(25))
                .build();
        partLines.add(partLine);
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);
        when(partLineRepository.findByIdAndEstimate_Id(partLineId, ESTIMATE_ID))
                .thenReturn(Optional.of(partLine));
        doAnswer(invocation -> {
            partLines.remove(partLine);
            return null;
        }).when(partLineRepository).delete(partLine);

        transaction.removePart(ESTIMATE_ID, partLineId);

        assertEquals(BigDecimal.ZERO, estimate.getTotalPartsAmount());
        assertEquals(BigDecimal.ZERO, estimate.getTotalAmount());
        verify(partLineRepository).delete(partLine);
    }

    @Test
    void submitsInitialEstimateAndMovesDiagnosingWorkOrderToPendingApproval() {
        UUID submitterId = UUID.randomUUID();
        WorkOrder workOrder = estimate.getWorkOrder();
        workOrder.setStatus(WorkOrderStatus.DIAGNOSING);
        when(workOrderRepository.findByIdForUpdate(workOrder.getId())).thenReturn(Optional.of(workOrder));

        var result = transaction.submit(ESTIMATE_ID, submitterId);

        assertEquals(EstimateStatus.PENDING_APPROVAL, result.status());
        assertEquals(WorkOrderStatus.PENDING_APPROVAL, workOrder.getStatus());
        verify(workOrderRepository).saveAndFlush(workOrder);
        verify(statusHistoryRepository).save(any());
    }

    @Test
    void submitsSupplementaryEstimateWithoutChangingInProgressWorkOrder() {
        WorkOrder workOrder = estimate.getWorkOrder();
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);
        estimate.setType(EstimateType.SUPPLEMENTARY);
        when(workOrderRepository.findByIdForUpdate(workOrder.getId())).thenReturn(Optional.of(workOrder));

        var result = transaction.submit(ESTIMATE_ID, UUID.randomUUID());

        assertEquals(EstimateStatus.PENDING_APPROVAL, result.status());
        assertEquals(WorkOrderStatus.IN_PROGRESS, workOrder.getStatus());
        verify(workOrderRepository, never()).saveAndFlush(any());
        verify(statusHistoryRepository, never()).save(any());
    }

    @Test
    void rejectsSubmissionWhenEstimateTypeDoesNotMatchWorkOrderState() {
        WorkOrder workOrder = estimate.getWorkOrder();
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);
        when(workOrderRepository.findByIdForUpdate(workOrder.getId())).thenReturn(Optional.of(workOrder));

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.submit(ESTIMATE_ID, UUID.randomUUID()));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        assertEquals(EstimateStatus.DRAFT, estimate.getStatus());
        verify(statusHistoryRepository, never()).save(any());
    }

    @Test
    void appliesServiceAndPartDecisionsAndMarksEstimatePartiallyApproved() {
        UUID serviceLineId = UUID.randomUUID();
        UUID partLineId = UUID.randomUUID();
        WorkOrderServiceLine serviceLine = WorkOrderServiceLine.builder()
                .id(serviceLineId)
                .estimate(estimate)
                .status(WorkOrderServiceStatus.PENDING)
                .build();
        WorkOrderPartLine partLine = WorkOrderPartLine.builder()
                .id(partLineId)
                .estimate(estimate)
                .status(WorkOrderPartStatus.PENDING)
                .build();
        serviceLines.add(serviceLine);
        partLines.add(partLine);
        estimate.getWorkOrder().setStatus(WorkOrderStatus.PENDING_APPROVAL);
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);

        var result = transaction.decide(ESTIMATE_ID, new EstimateDecisionRequest(List.of(
                new EstimateItemDecisionRequest(
                        EstimateItemType.SERVICE, serviceLineId, EstimateItemDecision.APPROVED),
                new EstimateItemDecisionRequest(
                        EstimateItemType.PART, partLineId, EstimateItemDecision.REJECTED))),
                UUID.randomUUID());

        assertEquals(WorkOrderServiceStatus.APPROVED, serviceLine.getStatus());
        assertEquals(WorkOrderPartStatus.REJECTED, partLine.getStatus());
        assertEquals(EstimateStatus.PARTIALLY_APPROVED, result.status());
        assertEquals(WorkOrderStatus.IN_PROGRESS, estimate.getWorkOrder().getStatus());
        verify(reservationRequestPublisher, never()).publish(any(PartsReservationRequestedEvent.class));
    }

    @Test
    void publishesApprovedPartsOnlyAfterEstimateDecisionIsFinal() {
        UUID actorId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        UUID partLineId = UUID.randomUUID();
        WorkOrderPartLine partLine = WorkOrderPartLine.builder()
                .id(partLineId)
                .estimate(estimate)
                .partId(partId)
                .requestedQuantity(2)
                .status(WorkOrderPartStatus.PENDING)
                .build();
        partLines.add(partLine);
        estimate.getWorkOrder().setStatus(WorkOrderStatus.PENDING_APPROVAL);
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);

        transaction.decide(ESTIMATE_ID, new EstimateDecisionRequest(List.of(
                new EstimateItemDecisionRequest(
                        EstimateItemType.PART, partLineId, EstimateItemDecision.APPROVED))), actorId);

        org.mockito.ArgumentCaptor<PartsReservationRequestedEvent> eventCaptor =
                org.mockito.ArgumentCaptor.forClass(PartsReservationRequestedEvent.class);
        verify(reservationRequestPublisher).publish(eventCaptor.capture());
        PartsReservationRequestedEvent event = eventCaptor.getValue();
        assertEquals(estimate.getWorkOrder().getId(), event.workOrderId());
        assertEquals(ESTIMATE_ID, event.estimateId());
        assertEquals(actorId, event.requestedBy());
        assertEquals(1, event.parts().size());
        assertEquals(partLineId, event.parts().get(0).workOrderPartId());
        assertEquals(partId, event.parts().get(0).catalogPartId());
        assertEquals(2, event.parts().get(0).quantity());
        assertEquals(WorkOrderStatus.PENDING_APPROVAL, estimate.getWorkOrder().getStatus());
    }

    @Test
    void movesInitialWorkOrderToInProgressWhenApprovedEstimateHasNoParts() {
        UUID actorId = UUID.randomUUID();
        UUID serviceLineId = UUID.randomUUID();
        serviceLines.add(WorkOrderServiceLine.builder()
                .id(serviceLineId)
                .estimate(estimate)
                .status(WorkOrderServiceStatus.PENDING)
                .build());
        estimate.getWorkOrder().setStatus(WorkOrderStatus.PENDING_APPROVAL);
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);

        transaction.decide(ESTIMATE_ID, new EstimateDecisionRequest(List.of(
                new EstimateItemDecisionRequest(
                        EstimateItemType.SERVICE, serviceLineId, EstimateItemDecision.APPROVED))), actorId);

        assertEquals(WorkOrderStatus.IN_PROGRESS, estimate.getWorkOrder().getStatus());
        verify(workOrderRepository).saveAndFlush(estimate.getWorkOrder());
        verify(statusHistoryRepository).save(any());
        verify(reservationRequestPublisher, never()).publish(any(PartsReservationRequestedEvent.class));
    }

    @Test
    void leavesEstimatePendingUntilEveryLineHasADecision() {
        UUID firstLineId = UUID.randomUUID();
        UUID secondLineId = UUID.randomUUID();
        WorkOrderServiceLine firstLine = WorkOrderServiceLine.builder()
                .id(firstLineId)
                .estimate(estimate)
                .status(WorkOrderServiceStatus.PENDING)
                .build();
        WorkOrderServiceLine secondLine = WorkOrderServiceLine.builder()
                .id(secondLineId)
                .estimate(estimate)
                .status(WorkOrderServiceStatus.PENDING)
                .build();
        serviceLines.addAll(List.of(firstLine, secondLine));
        estimate.getWorkOrder().setStatus(WorkOrderStatus.PENDING_APPROVAL);
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);
        EstimateDecisionRequest approveFirst = new EstimateDecisionRequest(List.of(
                new EstimateItemDecisionRequest(
                        EstimateItemType.SERVICE, firstLineId, EstimateItemDecision.APPROVED)));

        var pendingResult = transaction.decide(ESTIMATE_ID, approveFirst, UUID.randomUUID());

        assertEquals(EstimateStatus.PENDING_APPROVAL, pendingResult.status());
        assertEquals(WorkOrderServiceStatus.PENDING, secondLine.getStatus());

        var finalResult = transaction.decide(ESTIMATE_ID, new EstimateDecisionRequest(List.of(
                new EstimateItemDecisionRequest(
                        EstimateItemType.SERVICE, secondLineId, EstimateItemDecision.APPROVED))),
                UUID.randomUUID());

        assertEquals(EstimateStatus.APPROVED, finalResult.status());
    }

    @Test
    void cancelsWorkOrderWhenCustomerRejectsEveryItemOnInitialEstimate() {
        UUID serviceLineId = UUID.randomUUID();
        WorkOrder workOrder = estimate.getWorkOrder();
        workOrder.setStatus(WorkOrderStatus.PENDING_APPROVAL);
        WorkOrderServiceLine serviceLine = WorkOrderServiceLine.builder()
                .id(serviceLineId)
                .estimate(estimate)
                .status(WorkOrderServiceStatus.PENDING)
                .build();
        serviceLines.add(serviceLine);
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);
        when(workOrderRepository.findByIdForUpdate(workOrder.getId())).thenReturn(Optional.of(workOrder));

        var result = transaction.decide(ESTIMATE_ID, new EstimateDecisionRequest(List.of(
                new EstimateItemDecisionRequest(
                        EstimateItemType.SERVICE, serviceLineId, EstimateItemDecision.REJECTED))),
                UUID.randomUUID());

        assertEquals(EstimateStatus.REJECTED, result.status());
        assertEquals(WorkOrderStatus.CANCELED, workOrder.getStatus());
        verify(statusHistoryRepository).save(any());
    }

    @Test
    void doesNotAllowChangingAnExistingItemDecision() {
        UUID serviceLineId = UUID.randomUUID();
        serviceLines.add(WorkOrderServiceLine.builder()
                .id(serviceLineId)
                .estimate(estimate)
                .status(WorkOrderServiceStatus.APPROVED)
                .build());
        estimate.setStatus(EstimateStatus.PENDING_APPROVAL);

        ApiException exception = assertThrows(ApiException.class, () -> transaction.decide(
                ESTIMATE_ID,
                new EstimateDecisionRequest(List.of(new EstimateItemDecisionRequest(
                        EstimateItemType.SERVICE, serviceLineId, EstimateItemDecision.REJECTED))),
                UUID.randomUUID()));

        assertEquals(ErrorCode.ESTIMATE_ITEM_DECISION_CONFLICT, exception.getErrorCode());
    }
}
