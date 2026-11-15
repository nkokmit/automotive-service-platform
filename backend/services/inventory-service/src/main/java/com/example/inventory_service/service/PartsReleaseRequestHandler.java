package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.messaging.event.PartReservationItem;
import com.example.inventory_service.messaging.event.PartsReleaseRequestedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PartsReleaseRequestHandler {

    private final StockService stockService;

    @Transactional
    public void release(PartsReleaseRequestedEvent event) {
        validate(event);
        for (PartReservationItem part : event.parts()) {
            stockService.release(
                    new StockOperationRequest(
                            event.workOrderId(),
                            List.of(new StockItemRequest(part.catalogPartId(), part.quantity())),
                            "Work Order canceled event " + event.eventId()),
                    event.requestedBy(),
                    "cancel-" + event.workOrderId() + "-part-" + part.workOrderPartId());
        }
    }

    private void validate(PartsReleaseRequestedEvent event) {
        if (event == null || event.eventId() == null || event.workOrderId() == null
                || event.requestedBy() == null || event.parts() == null || event.parts().isEmpty()) {
            throw new IllegalArgumentException("Parts release request is missing required data");
        }

        Set<java.util.UUID> workOrderPartIds = new HashSet<>();
        for (PartReservationItem part : event.parts()) {
            if (part == null || part.workOrderPartId() == null || part.catalogPartId() == null
                    || part.quantity() == null || part.quantity() < 1
                    || !workOrderPartIds.add(part.workOrderPartId())) {
                throw new IllegalArgumentException("Parts release request contains an invalid part line");
            }
        }
    }
}
