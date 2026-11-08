package com.example.work_order_service.integration.contract;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookingContract(
        UUID id,
        UUID customerId,
        UUID vehicleId,
        UUID workOrderId,
        String licensePlateSnapshot,
        Instant startAt,
        Instant endAt,
        String status,
        String source,
        UUID createdBy,
        String customerNote,
        List<BookingServiceContract> services
) {
    public BookingContract {
        services = List.copyOf(services);
    }
}
