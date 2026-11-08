package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record VehicleContract(
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
