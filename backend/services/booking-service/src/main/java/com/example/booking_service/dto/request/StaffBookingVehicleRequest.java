package com.example.booking_service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record StaffBookingVehicleRequest(
        @NotNull UUID vehicleId,
        @NotNull @PositiveOrZero Integer odometerIn,
        @Size(max = 65535) String vehicleCondition,
        @Size(max = 65535) String customerNote
) {
}
