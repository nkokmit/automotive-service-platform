package com.example.work_order_service.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookingSummaryResponse(
        UUID id,
        String licensePlateSnapshot,
        Instant startAt,
        Instant endAt,
        String status,
        String source,
        String customerNote,
        List<BookingServiceSummaryResponse> services
) {
    public BookingSummaryResponse {
        services = List.copyOf(services);
    }
}
