package com.example.customer_vehicle_service.dto.response;

import java.util.UUID;

public record CustomerIdentityResponse(
        UUID customerId,
        Boolean isActive
) {
}
