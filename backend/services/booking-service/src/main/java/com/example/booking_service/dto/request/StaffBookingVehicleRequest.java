package com.example.booking_service.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StaffBookingVehicleRequest(@NotNull UUID vehicleId) {
}
