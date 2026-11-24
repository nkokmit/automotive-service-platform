package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent;
import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent.WorkOrderCompletedPartItem;
import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent.WorkOrderCompletedServiceItem;
import com.example.customer_vehicle_service.repository.ProcessedEventRepository;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import com.example.customer_vehicle_service.repository.VehicleServiceHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WorkOrderCompletedEventHandlerTest {

    private static final String TOPIC = "work-order-completed";
    private static final UUID WORK_ORDER_ID = UUID.randomUUID();
    private static final UUID VEHICLE_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    @Mock
    private ProcessedEventRepository processedEventRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private VehicleServiceHistoryRepository historyRepository;
    @InjectMocks
    private WorkOrderCompletedEventHandler handler;

    @Test
    void handleCreatesOneGarageHistoryWithServiceAndPartDetails() {
        Instant occurredAt = Instant.parse("2026-11-24T10:00:00Z");
        WorkOrderCompletedEvent event = event(
                List.of(new WorkOrderCompletedServiceItem(
                        UUID.randomUUID(), UUID.randomUUID(), "Thay dầu", BigDecimal.TEN, BigDecimal.TEN)),
                List.of(new WorkOrderCompletedPartItem(
                        UUID.randomUUID(), UUID.randomUUID(), "Dầu động cơ", "OIL-01",
                        "lít", 4, BigDecimal.TEN, BigDecimal.valueOf(40))),
                occurredAt);
        Vehicle vehicle = Vehicle.builder().id(VEHICLE_ID).build();
        given(processedEventRepository.insertIfAbsent(
                event.eventId().toString(), TOPIC, "WorkOrderCompletedEvent", WORK_ORDER_ID.toString()))
                .willReturn(1);
        given(historyRepository.existsByWorkOrderId(WORK_ORDER_ID)).willReturn(false);
        given(vehicleRepository.findByIdRaw(VEHICLE_ID)).willReturn(Optional.of(vehicle));

        handler.handle(event, TOPIC);

        ArgumentCaptor<VehicleServiceHistory> captor = ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        VehicleServiceHistory history = captor.getValue();
        assertThat(history.getVehicle()).isSameAs(vehicle);
        assertThat(history.getCustomerId()).isEqualTo(CUSTOMER_ID);
        assertThat(history.getWorkOrderId()).isEqualTo(WORK_ORDER_ID);
        assertThat(history.getRecordType()).isEqualTo(ServiceRecordType.GARAGE_SERVICE);
        assertThat(history.getServiceDate()).isEqualTo(occurredAt);
        assertThat(history.getSummary()).isEqualTo("Thay dầu");
        assertThat(history.getDescription())
                .contains("Thay dầu", "Dầu động cơ", "OIL-01", "x 4 lít");
    }

    @Test
    void handleSkipsHistoryWhenNoServiceWasCompleted() {
        WorkOrderCompletedEvent event = event(List.of(), List.of(), Instant.now());
        given(processedEventRepository.insertIfAbsent(
                event.eventId().toString(), TOPIC, "WorkOrderCompletedEvent", WORK_ORDER_ID.toString()))
                .willReturn(1);
        given(historyRepository.existsByWorkOrderId(WORK_ORDER_ID)).willReturn(false);

        handler.handle(event, TOPIC);

        verify(historyRepository, never()).save(any(VehicleServiceHistory.class));
        verify(vehicleRepository, never()).findByIdRaw(any());
    }

    @Test
    void handleIgnoresRepeatedEventId() {
        WorkOrderCompletedEvent event = event(
                List.of(service("Thay dầu")), List.of(), Instant.now());
        given(processedEventRepository.insertIfAbsent(
                event.eventId().toString(), TOPIC, "WorkOrderCompletedEvent", WORK_ORDER_ID.toString()))
                .willReturn(0);

        handler.handle(event, TOPIC);

        verify(historyRepository, never()).existsByWorkOrderId(any());
        verify(historyRepository, never()).save(any(VehicleServiceHistory.class));
        verify(vehicleRepository, never()).findByIdRaw(any());
    }

    @Test
    void handleUsesWorkOrderIdToIgnoreDifferentDuplicateEvent() {
        WorkOrderCompletedEvent event = event(
                List.of(service("Thay dầu")), List.of(), Instant.now());
        given(processedEventRepository.insertIfAbsent(
                event.eventId().toString(), TOPIC, "WorkOrderCompletedEvent", WORK_ORDER_ID.toString()))
                .willReturn(1);
        given(historyRepository.existsByWorkOrderId(WORK_ORDER_ID)).willReturn(true);

        handler.handle(event, TOPIC);

        verify(historyRepository, never()).save(any(VehicleServiceHistory.class));
        verify(vehicleRepository, never()).findByIdRaw(any());
    }

    @Test
    void handleRejectsMalformedEventBeforeMarkingItProcessed() {
        WorkOrderCompletedEvent event = new WorkOrderCompletedEvent(
                null, WORK_ORDER_ID, "WO-" + WORK_ORDER_ID, CUSTOMER_ID, VEHICLE_ID, List.of(service("Thay dầu")),
                List.of(), BigDecimal.ZERO, Instant.now());

        assertThatThrownBy(() -> handler.handle(event, TOPIC))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing required data");

        verify(processedEventRepository, never()).insertIfAbsent(any(), any(), any(), any());
    }

    @Test
    void handleKeepsFullServiceNamesInDescriptionWhenSummaryExceedsColumnLimit() {
        String longName = "D".repeat(300);
        WorkOrderCompletedEvent event = event(
                List.of(service(longName)), List.of(), Instant.now());
        given(processedEventRepository.insertIfAbsent(
                event.eventId().toString(), TOPIC, "WorkOrderCompletedEvent", WORK_ORDER_ID.toString()))
                .willReturn(1);
        given(historyRepository.existsByWorkOrderId(WORK_ORDER_ID)).willReturn(false);
        given(vehicleRepository.findByIdRaw(VEHICLE_ID))
                .willReturn(Optional.of(Vehicle.builder().id(VEHICLE_ID).build()));

        handler.handle(event, TOPIC);

        ArgumentCaptor<VehicleServiceHistory> captor = ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        assertThat(captor.getValue().getSummary()).hasSize(255).endsWith("...");
        assertThat(captor.getValue().getDescription()).contains(longName);
    }

    private WorkOrderCompletedEvent event(
            List<WorkOrderCompletedServiceItem> services,
            List<WorkOrderCompletedPartItem> parts,
            Instant occurredAt
    ) {
        return new WorkOrderCompletedEvent(
                UUID.randomUUID(), WORK_ORDER_ID, "WO-" + WORK_ORDER_ID, CUSTOMER_ID, VEHICLE_ID, services, parts,
                BigDecimal.ZERO, occurredAt);
    }

    private WorkOrderCompletedServiceItem service(String name) {
        return new WorkOrderCompletedServiceItem(
                UUID.randomUUID(), UUID.randomUUID(), name, BigDecimal.TEN, BigDecimal.TEN);
    }
}
