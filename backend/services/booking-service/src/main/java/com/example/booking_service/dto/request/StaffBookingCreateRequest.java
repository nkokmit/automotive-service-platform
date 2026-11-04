package com.example.booking_service.dto.request;

import com.example.booking_service.enums.BookingSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Booking do nhân viên tạo hộ khách; customer phải đã tồn tại trong customer-vehicle-service. */
public record StaffBookingCreateRequest(
        @NotNull BookingSource source,
        @NotNull Instant startAt,
        @NotEmpty List<@NotNull UUID> serviceIds,
        @NotBlank @Size(max = 20) String licensePlate,
        @NotNull UUID customerId,
        @Size(max = 1000) String customerNote
) {
}
