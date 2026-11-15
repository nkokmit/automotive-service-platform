package com.example.booking_service.dto.response;

import com.example.booking_service.enums.BookingStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        UUID customerId,
        UUID vehicleId,
        String licensePlateSnapshot,
        Instant startAt,
        Instant endAt,
        BookingStatus status,
        String customerNote,
        List<BookingServiceResponse> services,
        Instant createdAt,
        Instant updatedAt
) {
    public BookingResponse {
        services = List.copyOf(services);
    }
}
