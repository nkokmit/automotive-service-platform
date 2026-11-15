package com.example.booking_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookingCreateRequest(
        @NotNull Instant startAt,
        @NotEmpty List<@NotNull UUID> serviceIds,
        @NotBlank @Size(max = 20) String licensePlate,
        @Size(max = 1000) String customerNote
) {
}
