package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record InternalPartStockCommand(
        UUID workOrderId,
        UUID partId,
        Integer quantity,
        String idempotencyKey,
        UUID requestedBy
) {
}
