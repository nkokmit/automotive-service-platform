package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderRequest;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderCreationTransactionTest {

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;

    @Test
    void createsWorkOrderAndInitialStatusHistory() {
        UUID workOrderId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        UUID advisorId = UUID.randomUUID();
        when(workOrderRepository.saveAndFlush(any(WorkOrder.class))).thenAnswer(invocation -> {
            WorkOrder workOrder = invocation.getArgument(0);
            workOrder.setId(workOrderId);
            return workOrder;
        });

        WorkOrderCreationTransaction transaction = new WorkOrderCreationTransaction(workOrderRepository, historyRepository);
        WorkOrder workOrder = transaction.create(
                new CreateWorkOrderRequest(bookingId, 1200, "Minor damage", "Call before repairs"),
                new BookingContract(
                        bookingId, customerId, vehicleId, null, "51A-12345", null, null,
                        "CHECKED_IN", "WALK_IN", null, null, List.of()),
                advisorId);

        assertEquals(WorkOrderStatus.CREATED, workOrder.getStatus());
        assertEquals("WO-", workOrder.getCode().substring(0, 3));
        assertEquals(bookingId, workOrder.getBookingId());
        assertEquals(customerId, workOrder.getCustomerId());
        assertEquals(vehicleId, workOrder.getVehicleId());
        assertEquals(advisorId, workOrder.getAdvisorId());

        ArgumentCaptor<WorkOrderStatusHistory> historyCaptor =
                ArgumentCaptor.forClass(WorkOrderStatusHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertEquals(WorkOrderStatus.CREATED.name(), historyCaptor.getValue().getStatusTo());
        assertEquals(advisorId, historyCaptor.getValue().getChangedBy());

    }
}
