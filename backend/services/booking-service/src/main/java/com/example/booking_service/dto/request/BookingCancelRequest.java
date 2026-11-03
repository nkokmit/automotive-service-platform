package com.example.booking_service.dto.request;

import jakarta.validation.constraints.Size;

public record BookingCancelRequest(
        @Size(max = 500) String reason
) {
}
