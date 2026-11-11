package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.messaging.event.PartReservationItem;
import com.example.inventory_service.messaging.event.PartsReleaseRequestedEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PartsReleaseRequestHandlerTest {

    @Mock
    private StockService stockService;

    @Test
    void releasesEachPartUsingStablePerLineIdempotencyKey() {
        UUID eventId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID workOrderPartId = UUID.randomUUID();
        UUID catalogPartId = UUID.randomUUID();
        PartsReleaseRequestHandler handler = new PartsReleaseRequestHandler(stockService);

        handler.release(new PartsReleaseRequestedEvent(
                eventId,
                workOrderId,
                actorId,
                List.of(new PartReservationItem(workOrderPartId, catalogPartId, 3))));

        verify(stockService).release(
                eq(new StockOperationRequest(
                        workOrderId,
                        List.of(new StockItemRequest(catalogPartId, 3)),
                        "Work Order canceled event " + eventId)),
                eq(actorId),
                eq("cancel-" + workOrderId + "-part-" + workOrderPartId));
    }

    @Test
    void rejectsInvalidReleaseItemsBeforeCallingInventory() {
        PartsReleaseRequestHandler handler = new PartsReleaseRequestHandler(stockService);
        UUID duplicateId = UUID.randomUUID();
        UUID workOrderId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID catalogPartId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class,
                () -> handler.release(new PartsReleaseRequestedEvent(
                        UUID.randomUUID(),
                        workOrderId,
                        actorId,
                        List.of(
                                new PartReservationItem(duplicateId, catalogPartId, 1),
                                new PartReservationItem(duplicateId, catalogPartId, 1)))));

        verify(stockService, never()).release(any(StockOperationRequest.class), any(), anyString());
    }
}
