package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AddServiceToEstimateRequest;
import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderPartLine;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateType;
import com.example.work_order_service.enums.WorkOrderPartStatus;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.ServiceEstimateCatalog;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.mapper.EstimateMapper;
import com.example.work_order_service.repository.EstimateRepository;
import com.example.work_order_service.repository.WorkOrderPartLineRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
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

    private EstimateTransaction transaction;
    private Estimate estimate;
    private List<WorkOrderServiceLine> serviceLines;
    private List<WorkOrderPartLine> partLines;

    @BeforeEach
    void setUp() {
        transaction = new EstimateTransaction(
                workOrderRepository,
                estimateRepository,
                serviceLineRepository,
                partLineRepository,
                new EstimateMapper());
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
}
