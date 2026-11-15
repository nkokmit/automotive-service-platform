package com.example.work_order_service.dto.response;

import java.util.UUID;

public record VehicleSummaryResponse(
        UUID id,
        String licensePlate,
        String vin,
        String make,
        String model,
        Short modelYear,
        String trim,
        String color,
        String fuelType,
        String transmission,
        Integer odometerKm,
        String notes,
        Boolean isActive
) {
}
