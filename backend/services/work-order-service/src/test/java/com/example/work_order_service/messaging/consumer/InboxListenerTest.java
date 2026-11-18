package com.example.work_order_service.messaging.consumer;

import com.example.work_order_service.messaging.event.PartsReservationFailedEvent;
import com.example.work_order_service.messaging.event.PartsReservedEvent;
import com.example.work_order_service.messaging.event.VehicleCheckedInEvent;
import com.example.work_order_service.service.InboxEventService;
import com.example.work_order_service.service.PartsReservationResultHandler;
import com.example.work_order_service.service.WorkOrderCheckInEventHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InboxListenerTest {

    @Mock
    private InboxEventService inboxEventService;
    @Mock
    private WorkOrderCheckInEventHandler checkInEventHandler;
    @Mock
    private PartsReservationResultHandler reservationResultHandler;

    @Test
    void skipsDuplicateVehicleCheckIn() {
        VehicleCheckedInEvent event = new VehicleCheckedInEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), 100, null, null, Instant.now());
        when(inboxEventService.markProcessed(
                event.eventId(), "vehicle-checked-in", "VehicleCheckedInEvent", event.bookingId()))
                .thenReturn(false);
        VehicleCheckedInEventListener listener = new VehicleCheckedInEventListener(
                inboxEventService, checkInEventHandler);
        ReflectionTestUtils.setField(listener, "topic", "vehicle-checked-in");

        listener.onVehicleCheckedIn(event);

        verify(checkInEventHandler, never()).handle(event);
    }

    @Test
    void skipsDuplicateReservationSuccess() {
        PartsReservedEvent event = new PartsReservedEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                List.of());
        when(inboxEventService.markProcessed(
                event.eventId(), "parts-reserved", "PartsReservedEvent", event.workOrderId()))
                .thenReturn(false);
        PartsReservedEventListener listener = new PartsReservedEventListener(
                inboxEventService, reservationResultHandler);
        ReflectionTestUtils.setField(listener, "topic", "parts-reserved");

        listener.onPartsReserved(event);

        verify(reservationResultHandler, never()).handleReserved(event);
    }

    @Test
    void processesNewReservationSuccess() {
        PartsReservedEvent event = new PartsReservedEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                List.of());
        when(inboxEventService.markProcessed(
                event.eventId(), "parts-reserved", "PartsReservedEvent", event.workOrderId()))
                .thenReturn(true);
        PartsReservedEventListener listener = new PartsReservedEventListener(
                inboxEventService, reservationResultHandler);
        ReflectionTestUtils.setField(listener, "topic", "parts-reserved");

        listener.onPartsReserved(event);

        verify(reservationResultHandler).handleReserved(event);
    }

    @Test
    void propagatesReservationHandlerFailureForKafkaRetry() {
        PartsReservedEvent event = new PartsReservedEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                List.of());
        when(inboxEventService.markProcessed(
                event.eventId(), "parts-reserved", "PartsReservedEvent", event.workOrderId()))
                .thenReturn(true);
        doThrow(new IllegalStateException("handler failed"))
                .when(reservationResultHandler).handleReserved(event);
        PartsReservedEventListener listener = new PartsReservedEventListener(
                inboxEventService, reservationResultHandler);
        ReflectionTestUtils.setField(listener, "topic", "parts-reserved");

        assertThrows(IllegalStateException.class, () -> listener.onPartsReserved(event));
    }

    @Test
    void skipsDuplicateReservationFailure() {
        PartsReservationFailedEvent event = new PartsReservationFailedEvent(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                List.of(), "Insufficient stock");
        when(inboxEventService.markProcessed(
                event.eventId(), "parts-reservation-failed",
                "PartsReservationFailedEvent", event.workOrderId()))
                .thenReturn(false);
        PartsReservationFailedEventListener listener = new PartsReservationFailedEventListener(
                inboxEventService, reservationResultHandler);
        ReflectionTestUtils.setField(listener, "topic", "parts-reservation-failed");

        listener.onPartsReservationFailed(event);

        verify(reservationResultHandler, never()).handleFailed(event);
    }
}
