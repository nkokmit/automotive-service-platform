package com.example.booking_service.dto.request;

import com.example.booking_service.enums.BookingSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Booking do nhân viên tạo hộ khách: cung cấp đúng một trong {@code customerId} hoặc {@code customer}. */
public record StaffBookingCreateRequest(
        @NotNull BookingSource source,
        @NotNull Instant startAt,
        @NotEmpty List<@NotNull UUID> serviceIds,
        @NotBlank @Size(max = 20) String licensePlate,
        UUID customerId,
        @Valid CustomerInfo customer,
        @Size(max = 1000) String customerNote
) {
    public record CustomerInfo(
            @NotBlank @Size(max = 150) String fullName,
            @NotBlank @Size(max = 20) String phone,
            @Email @Size(max = 255) String email
    ) {
    }
}
