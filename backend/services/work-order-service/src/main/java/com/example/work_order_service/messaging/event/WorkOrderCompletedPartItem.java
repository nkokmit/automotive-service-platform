package com.example.work_order_service.messaging.event;

import java.math.BigDecimal;
import java.util.UUID;

public record WorkOrderCompletedPartItem(
        UUID workOrderPartId,
        UUID partId,
        String name,
        String sku,
        String unit,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice
) {
}
