package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.entity.ProcessedReservationRequest;
import com.example.inventory_service.enums.ReservationRequestStatus;
import com.example.inventory_service.messaging.event.PartReservationItem;
import com.example.inventory_service.messaging.event.PartsReservationFailedEvent;
import com.example.inventory_service.messaging.event.PartsReservationRequestedEvent;
import com.example.inventory_service.messaging.event.PartsReservedEvent;
import com.example.inventory_service.repository.ProcessedReservationRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PartsReservationRequestHandler {

    private final StockService stockService;
    private final ProcessedReservationRequestRepository processedRequestRepository;

    @Transactional
    public PartsReservationOutcome reserve(PartsReservationRequestedEvent event) {
        validate(event);

        var existingRequest = processedRequestRepository.findById(event.eventId());
        if (existingRequest.isPresent()) {
            ProcessedReservationRequest processed = existingRequest.get();
            validateRequestIdentity(event, processed);
            return outcome(event, processed);
        }

        List<StockItemRequest> stockItems = event.parts().stream()
                .map(item -> new StockItemRequest(item.catalogPartId(), item.quantity()))
                .toList();
        stockService.reserve(new StockOperationRequest(
                event.workOrderId(),
                stockItems,
                "Estimate " + event.estimateId() + " reservation event " + event.eventId()),
                event.requestedBy());

        processedRequestRepository.save(ProcessedReservationRequest.builder()
                .eventId(event.eventId())
                .workOrderId(event.workOrderId())
                .estimateId(event.estimateId())
                .status(ReservationRequestStatus.RESERVED)
                .build());
        return new PartsReservationOutcome.Reserved(reservedEvent(event));
    }

    private PartsReservationOutcome outcome(
            PartsReservationRequestedEvent event,
            ProcessedReservationRequest processed
    ) {
        if (processed.getStatus() == ReservationRequestStatus.RESERVED) {
            return new PartsReservationOutcome.Reserved(reservedEvent(event));
        }
        return new PartsReservationOutcome.Failed(new PartsReservationFailedEvent(
                event.eventId(),
                event.workOrderId(),
                event.estimateId(),
                event.requestedBy(),
                event.parts(),
                processed.getFailureReason()));
    }

    private PartsReservedEvent reservedEvent(PartsReservationRequestedEvent event) {
        return new PartsReservedEvent(
                event.eventId(), event.workOrderId(), event.estimateId(), event.requestedBy(), event.parts());
    }

    static void validateRequestIdentity(
            PartsReservationRequestedEvent event,
            ProcessedReservationRequest processed
    ) {
        if (!processed.getWorkOrderId().equals(event.workOrderId())
                || !processed.getEstimateId().equals(event.estimateId())) {
            throw new IllegalArgumentException("Reservation event ID was reused for a different request");
        }
    }

    private void validate(PartsReservationRequestedEvent event) {
        if (event == null || event.eventId() == null || event.workOrderId() == null
                || event.estimateId() == null || event.requestedBy() == null
                || event.parts() == null || event.parts().isEmpty()) {
            throw new IllegalArgumentException("Reservation request is missing required data");
        }

        Set<java.util.UUID> workOrderPartIds = new HashSet<>();
        for (PartReservationItem item : event.parts()) {
            if (item == null || item.workOrderPartId() == null || item.catalogPartId() == null
                    || item.quantity() == null || item.quantity() < 1
                    || !workOrderPartIds.add(item.workOrderPartId())) {
                throw new IllegalArgumentException("Reservation request contains an invalid part line");
            }
        }
    }
}
