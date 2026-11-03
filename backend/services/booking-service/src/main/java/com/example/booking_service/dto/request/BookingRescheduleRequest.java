package com.example.booking_service.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record BookingRescheduleRequest(
        @NotNull @Future Instant startAt
) {
}
