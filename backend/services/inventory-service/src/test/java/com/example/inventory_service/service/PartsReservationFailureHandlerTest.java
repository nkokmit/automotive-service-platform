package com.example.inventory_service.service;

import com.example.inventory_service.entity.ProcessedReservationRequest;
import com.example.inventory_service.enums.ReservationRequestStatus;
import com.example.inventory_service.messaging.event.PartReservationItem;
import com.example.inventory_service.messaging.event.PartsReservationRequestedEvent;
import com.example.inventory_service.repository.ProcessedReservationRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartsReservationFailureHandlerTest {

    private final UUID eventId = UUID.randomUUID();
    private final UUID workOrderId = UUID.randomUUID();
    private final UUID estimateId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();

    @Mock
    private ProcessedReservationRequestRepository processedRequestRepository;

    private PartsReservationFailureHandler handler;

    @BeforeEach
    void setUp() {
        handler = new PartsReservationFailureHandler(processedRequestRepository);
    }

    @Test
    void storesFailureOutcomeForRedeliveredRequests() {
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.empty());

        var outcome = handler.recordFailure(event(), "Insufficient stock");

        assertThat(outcome).isInstanceOf(PartsReservationOutcome.Failed.class);
        var failedEvent = ((PartsReservationOutcome.Failed) outcome).event();
        assertThat(failedEvent.reason()).isEqualTo("Insufficient stock");
        var savedRequest = org.mockito.ArgumentCaptor.forClass(ProcessedReservationRequest.class);
        verify(processedRequestRepository).save(savedRequest.capture());
        assertThat(savedRequest.getValue().getStatus()).isEqualTo(ReservationRequestStatus.FAILED);
        assertThat(savedRequest.getValue().getFailureReason()).isEqualTo("Insufficient stock");
    }

    @Test
    void reusesPreviouslyStoredFailureOutcome() {
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.of(
                ProcessedReservationRequest.builder()
                        .eventId(eventId)
                        .workOrderId(workOrderId)
                        .estimateId(estimateId)
                        .status(ReservationRequestStatus.FAILED)
                        .failureReason("Insufficient stock")
                        .build()));

        var outcome = handler.recordFailure(event(), "Different transient message");

        assertThat(((PartsReservationOutcome.Failed) outcome).event().reason())
                .isEqualTo("Insufficient stock");
        verify(processedRequestRepository, never()).save(any(ProcessedReservationRequest.class));
    }

    @Test
    void reportsPriorSuccessIfFailureDeliveryRacesWithSuccessfulReservation() {
        when(processedRequestRepository.findById(eventId)).thenReturn(Optional.of(
                ProcessedReservationRequest.builder()
                        .eventId(eventId)
                        .workOrderId(workOrderId)
                        .estimateId(estimateId)
                        .status(ReservationRequestStatus.RESERVED)
                        .build()));

        var outcome = handler.recordFailure(event(), "Insufficient stock");

        assertThat(outcome).isInstanceOf(PartsReservationOutcome.Reserved.class);
        verify(processedRequestRepository, never()).save(any(ProcessedReservationRequest.class));
    }

    private PartsReservationRequestedEvent event() {
        return new PartsReservationRequestedEvent(
                eventId, workOrderId, estimateId, actorId,
                List.of(new PartReservationItem(UUID.randomUUID(), UUID.randomUUID(), 1)));
    }
}
