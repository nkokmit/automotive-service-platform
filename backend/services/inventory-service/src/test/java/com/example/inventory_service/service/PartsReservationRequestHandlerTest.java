package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.entity.ProcessedReservationRequest;
import com.example.inventory_service.enums.ReservationRequestStatus;
import com.example.inventory_service.messaging.event.PartReservationItem;
import com.example.inventory_service.messaging.event.PartsReservationRequestedEvent;
import com.example.inventory_service.repository.ProcessedReservationRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartsReservationRequestHandlerTest {

    private final UUID eventId = UUID.randomUUID();
    private final UUID workOrderId = UUID.randomUUID();
    private final UUID estimateId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID workOrderPartId = UUID.randomUUID();
    private final UUID catalogPartId = UUID.randomUUID();

    @Mock
    private StockService stockService;
    @Mock
    private ProcessedReservationRequestRepository processedRequestRepository;

    private PartsReservationRequestHandler handler;

    @BeforeEach
    void setUp() {
        handler = new PartsReservationRequestHandler(stockService, processedRequestRepository);
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.empty());
    }

    @Test
    void reservesRequestedPartsAndStoresEventIdempotencyKey() {
        var result = handler.reserve(event());

        ArgumentCaptor<StockOperationRequest> requestCaptor =
                ArgumentCaptor.forClass(StockOperationRequest.class);
        verify(stockService).reserve(requestCaptor.capture(), org.mockito.ArgumentMatchers.eq(actorId));
        assertThat(requestCaptor.getValue().referenceId()).isEqualTo(workOrderId);
        assertThat(requestCaptor.getValue().items()).containsExactly(
                new com.example.inventory_service.dto.request.StockItemRequest(catalogPartId, 3));
        verify(processedRequestRepository).save(any(ProcessedReservationRequest.class));
        assertThat(result).isInstanceOf(PartsReservationOutcome.Reserved.class);
        var reserved = ((PartsReservationOutcome.Reserved) result).event();
        assertThat(reserved.eventId()).isEqualTo(eventId);
        assertThat(reserved.parts()).containsExactly(new PartReservationItem(workOrderPartId, catalogPartId, 3));
    }

    @Test
    void repeatedEventReturnsSuccessWithoutReservingTwice() {
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.of(
                ProcessedReservationRequest.builder()
                        .eventId(eventId)
                        .workOrderId(workOrderId)
                        .estimateId(estimateId)
                        .build()));

        var result = handler.reserve(event());

        verify(stockService, never()).reserve(any(), any());
        verify(processedRequestRepository, never()).save(any(ProcessedReservationRequest.class));
        assertThat(result).isInstanceOf(PartsReservationOutcome.Reserved.class);
    }

    @Test
    void repeatedFailedEventReturnsFailureWithoutRetryingReservation() {
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.of(
                ProcessedReservationRequest.builder()
                        .eventId(eventId)
                        .workOrderId(workOrderId)
                        .estimateId(estimateId)
                        .status(ReservationRequestStatus.FAILED)
                        .failureReason("Insufficient stock")
                        .build()));

        var result = handler.reserve(event());

        verify(stockService, never()).reserve(any(), any());
        assertThat(result).isInstanceOf(PartsReservationOutcome.Failed.class);
        var failed = ((PartsReservationOutcome.Failed) result).event();
        assertThat(failed.eventId()).isEqualTo(eventId);
        assertThat(failed.reason()).isEqualTo("Insufficient stock");
    }

    @Test
    void rejectsReusedEventIdForDifferentEstimate() {
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.of(
                ProcessedReservationRequest.builder()
                        .eventId(eventId)
                        .workOrderId(workOrderId)
                        .estimateId(UUID.randomUUID())
                        .build()));

        assertThatThrownBy(() -> handler.reserve(event()))
                .isInstanceOf(IllegalArgumentException.class);
        verify(stockService, never()).reserve(any(), any());
    }

    private PartsReservationRequestedEvent event() {
        return new PartsReservationRequestedEvent(
                eventId, workOrderId, estimateId, actorId,
                List.of(new PartReservationItem(workOrderPartId, catalogPartId, 3)));
    }
}
