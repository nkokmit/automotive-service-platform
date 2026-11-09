package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record StaffProfileContract(
        UUID id,
        UUID userId,
        Boolean isActive
) {
}
