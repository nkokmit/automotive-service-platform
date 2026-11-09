package com.example.work_order_service.service;

import com.example.work_order_service.entity.Estimate;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderServiceLine;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderServiceLineTransactionTest {

    private static final UUID SERVICE_LINE_ID = UUID.randomUUID();
    private static final UUID WORK_ORDER_ID = UUID.randomUUID();
    private static final UUID MECHANIC_ID = UUID.randomUUID();

    @Mock
    private WorkOrderServiceLineRepository serviceLineRepository;
    @Mock
    private WorkOrderRepository workOrderRepository;

    private WorkOrderServiceLineTransaction transaction;
    private WorkOrderServiceLine serviceLine;
    private WorkOrder workOrder;

    @BeforeEach
    void setUp() {
        transaction = new WorkOrderServiceLineTransaction(serviceLineRepository, workOrderRepository);
        workOrder = WorkOrder.builder()
                .id(WORK_ORDER_ID)
                .code("WO-1")
                .status(WorkOrderStatus.IN_PROGRESS)
                .build();
        Estimate estimate = Estimate.builder()
                .id(UUID.randomUUID())
                .workOrder(workOrder)
                .build();
        serviceLine = WorkOrderServiceLine.builder()
                .id(SERVICE_LINE_ID)
                .estimate(estimate)
                .serviceId(UUID.randomUUID())
                .snapshotName("Brake service")
                .status(WorkOrderServiceStatus.APPROVED)
                .assignedTechId(MECHANIC_ID)
                .build();
        when(serviceLineRepository.findByIdForUpdate(SERVICE_LINE_ID))
                .thenReturn(Optional.of(serviceLine));
        lenient().when(workOrderRepository.findByIdForUpdate(WORK_ORDER_ID))
                .thenReturn(Optional.of(workOrder));
        lenient().when(serviceLineRepository.save(any(WorkOrderServiceLine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void startsAssignedApprovedServiceLine() {
        var result = transaction.start(SERVICE_LINE_ID, MECHANIC_ID);

        assertEquals(WorkOrderServiceStatus.IN_PROGRESS, result.status());
        verify(serviceLineRepository).save(serviceLine);
    }

    @Test
    void completesInProgressLineAndRecordsCompletionTime() {
        serviceLine.setStatus(WorkOrderServiceStatus.IN_PROGRESS);

        var result = transaction.complete(SERVICE_LINE_ID, MECHANIC_ID);

        assertEquals(WorkOrderServiceStatus.COMPLETED, result.status());
        assertNotNull(result.completedAt());
        verify(serviceLineRepository).save(serviceLine);
    }

    @Test
    void rejectsStartByMechanicOtherThanAssignee() {
        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.start(SERVICE_LINE_ID, UUID.randomUUID()));

        assertEquals(ErrorCode.UNAUTHORIZED, exception.getErrorCode());
    }

    @Test
    void rejectsStartingServiceLineBeforeWorkOrderIsInProgress() {
        workOrder.setStatus(WorkOrderStatus.PENDING_APPROVAL);

        ApiException exception = assertThrows(ApiException.class,
                () -> transaction.start(SERVICE_LINE_ID, MECHANIC_ID));

        assertEquals(ErrorCode.INVALID_SERVICE_LINE_STATUS_TRANSITION, exception.getErrorCode());
    }
}
