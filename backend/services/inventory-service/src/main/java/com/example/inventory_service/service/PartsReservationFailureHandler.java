package com.example.inventory_service.service;

import com.example.inventory_service.entity.ProcessedReservationRequest;
import com.example.inventory_service.enums.ReservationRequestStatus;
import com.example.inventory_service.messaging.event.PartsReservationFailedEvent;
import com.example.inventory_service.messaging.event.PartsReservationRequestedEvent;
import com.example.inventory_service.messaging.event.PartsReservedEvent;
import com.example.inventory_service.repository.ProcessedReservationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PartsReservationFailureHandler {

    private final ProcessedReservationRequestRepository processedRequestRepository;

    @Transactional
    public PartsReservationOutcome recordFailure(PartsReservationRequestedEvent event, String reason) {
        var existingRequest = processedRequestRepository.findById(event.eventId());
        if (existingRequest.isPresent()) {
            ProcessedReservationRequest processed = existingRequest.get();
            PartsReservationRequestHandler.validateRequestIdentity(event, processed);
            if (processed.getStatus() == ReservationRequestStatus.RESERVED) {
                return new PartsReservationOutcome.Reserved(new PartsReservedEvent(
                        event.eventId(),
                        event.workOrderId(),
                        event.estimateId(),
                        event.requestedBy(),
                        event.parts()));
            }
            return new PartsReservationOutcome.Failed(new PartsReservationFailedEvent(
                    event.eventId(),
                    event.workOrderId(),
                    event.estimateId(),
                    event.requestedBy(),
                    event.parts(),
                    processed.getFailureReason()));
        }

        processedRequestRepository.save(ProcessedReservationRequest.builder()
                .eventId(event.eventId())
                .workOrderId(event.workOrderId())
                .estimateId(event.estimateId())
                .status(ReservationRequestStatus.FAILED)
                .failureReason(reason)
                .build());
        return new PartsReservationOutcome.Failed(new PartsReservationFailedEvent(
                event.eventId(),
                event.workOrderId(),
                event.estimateId(),
                event.requestedBy(),
                event.parts(),
                reason));
    }
}
