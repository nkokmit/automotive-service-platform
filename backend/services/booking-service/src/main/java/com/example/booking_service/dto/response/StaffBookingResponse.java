package com.example.booking_service.dto.response;

import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record StaffBookingResponse(
        UUID id,
        UUID customerId,
        UUID vehicleId,
        UUID workOrderId,
        String licensePlateSnapshot,
        Instant startAt,
        Instant endAt,
        BookingStatus status,
        BookingSource source,
        UUID createdBy,
        String customerNote,
        List<BookingServiceResponse> services,
        Instant createdAt,
        Instant updatedAt,
        Instant cancelledAt,
        Instant checkedInAt
) {
    public StaffBookingResponse {
        services = List.copyOf(services);
    }
}
