package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record InternalInventoryTransactionContract(
        UUID id,
        UUID partId,
        String type,
        Integer quantity,
        UUID referenceId
) {
}
