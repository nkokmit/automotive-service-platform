package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderStatusHistory;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.messaging.event.PaymentCompletedEvent;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentCompletedEventHandlerTest {

    private final UUID workOrderId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;

    private WorkOrder workOrder;
    private PaymentCompletedEventHandler handler;

    @BeforeEach
    void setUp() {
        handler = new PaymentCompletedEventHandler(workOrderRepository, historyRepository);
        workOrder = WorkOrder.builder()
                .id(workOrderId)
                .customerId(customerId)
                .status(WorkOrderStatus.PENDING_PAYMENT)
                .build();
        when(workOrderRepository.findByIdForUpdate(workOrderId)).thenReturn(Optional.of(workOrder));
    }

    @Test
    void closesPaidWorkOrderAndRecordsStatusHistory() {
        handler.handle(event());

        assertEquals(WorkOrderStatus.CLOSED, workOrder.getStatus());
        ArgumentCaptor<WorkOrderStatusHistory> history =
                ArgumentCaptor.forClass(WorkOrderStatusHistory.class);
        verify(historyRepository).save(history.capture());
        assertEquals(WorkOrderStatus.PENDING_PAYMENT.name(), history.getValue().getStatusFrom());
        assertEquals(WorkOrderStatus.CLOSED.name(), history.getValue().getStatusTo());
        assertEquals(customerId, history.getValue().getChangedBy());
    }

    @Test
    void repeatedPaidEventDoesNotWriteAnotherTransition() {
        workOrder.setStatus(WorkOrderStatus.CLOSED);

        handler.handle(event());

        verify(workOrderRepository, never()).saveAndFlush(workOrder);
        verify(historyRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectsPaymentForDifferentCustomer() {
        PaymentCompletedEvent mismatchedEvent = new PaymentCompletedEvent(
                UUID.randomUUID(), UUID.randomUUID(), "INV-1", workOrderId, UUID.randomUUID(),
                UUID.randomUUID(), BigDecimal.TEN, Instant.now());

        assertThrows(IllegalArgumentException.class, () -> handler.handle(mismatchedEvent));

        assertEquals(WorkOrderStatus.PENDING_PAYMENT, workOrder.getStatus());
        verify(historyRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectsWorkOrderThatIsNotWaitingForPayment() {
        workOrder.setStatus(WorkOrderStatus.CANCELED);

        ApiException exception = assertThrows(ApiException.class, () -> handler.handle(event()));

        assertEquals(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION, exception.getErrorCode());
        verify(historyRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private PaymentCompletedEvent event() {
        return new PaymentCompletedEvent(
                UUID.randomUUID(), UUID.randomUUID(), "INV-1", workOrderId, customerId,
                UUID.randomUUID(), BigDecimal.TEN, Instant.now());
    }
}
