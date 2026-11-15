package com.example.work_order_service.service;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.messaging.event.VehicleCheckedInEvent;
import com.example.work_order_service.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderCheckInEventHandlerTest {

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderCreationTransaction creationTransaction;
    @Mock
    private WorkOrderIntegrationService integrationService;

    private WorkOrderCheckInEventHandler eventHandler;

    @BeforeEach
    void setUp() {
        eventHandler = new WorkOrderCheckInEventHandler(workOrderRepository, creationTransaction, integrationService);
    }

    @Test
    void createsWorkOrderFromBookingCheckInEvent() {
        VehicleCheckedInEvent event = validEvent();
        when(workOrderRepository.findByBookingId(event.bookingId())).thenReturn(Optional.empty());

        eventHandler.handle(event);

        verify(integrationService).requireBookingCheckedIn(event.bookingId(), event.customerId(), event.vehicleId());
        verify(creationTransaction).createFromCheckInEvent(
                event.bookingId(),
                event.customerId(),
                event.vehicleId(),
                event.advisorId(),
                event.odometerIn(),
                event.vehicleCondition(),
                event.customerNote());
    }

    @Test
    void doesNotCreateWorkOrderWhenBookingIsNotCheckedIn() {
        VehicleCheckedInEvent event = validEvent();
        when(workOrderRepository.findByBookingId(event.bookingId())).thenReturn(Optional.empty());
        doThrow(new ApiException(ErrorCode.BOOKING_NOT_CHECKED_IN))
                .when(integrationService).requireBookingCheckedIn(any(), any(), any());

        ApiException exception = assertThrows(ApiException.class, () -> eventHandler.handle(event));

        assertEquals(ErrorCode.BOOKING_NOT_CHECKED_IN, exception.getErrorCode());
        verify(creationTransaction, never()).createFromCheckInEvent(
                any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void duplicateBookingEventDoesNotCreateAnotherWorkOrder() {
        VehicleCheckedInEvent event = validEvent();
        when(workOrderRepository.findByBookingId(event.bookingId()))
                .thenReturn(Optional.of(WorkOrder.builder().status(WorkOrderStatus.CREATED).build()));

        eventHandler.handle(event);

        verify(creationTransaction, never()).createFromCheckInEvent(
                any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejectsEventWithoutRequiredCheckInData() {
        VehicleCheckedInEvent event = new VehicleCheckedInEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), null, null, null, Instant.now());

        ApiException exception = assertThrows(ApiException.class, () -> eventHandler.handle(event));

        assertEquals(ErrorCode.INVALID_REQUEST, exception.getErrorCode());
        verify(workOrderRepository, never()).findByBookingId(any());
    }

    private VehicleCheckedInEvent validEvent() {
        return new VehicleCheckedInEvent(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                1200,
                "Minor damage",
                "Call first",
                Instant.now());
    }
}
