package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record CustomerIdentityContract(
        UUID customerId,
        Boolean isActive
) {
}
