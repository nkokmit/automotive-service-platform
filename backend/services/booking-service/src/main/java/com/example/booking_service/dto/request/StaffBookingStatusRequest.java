package com.example.booking_service.dto.request;

import com.example.booking_service.enums.BookingStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StaffBookingStatusRequest(
        @NotNull BookingStatus status,
        @Size(max = 255) String reason
) {
}
