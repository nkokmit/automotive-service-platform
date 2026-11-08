package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record CustomerContract(
        UUID id,
        String fullName,
        String phone,
        String email,
        Boolean isActive
) {
}
