package com.example.work_order_service.messaging.event;

import java.math.BigDecimal;
import java.util.UUID;

public record WorkOrderCompletedServiceItem(
        UUID serviceLineId,
        UUID serviceId,
        String name,
        BigDecimal unitPrice,
        BigDecimal totalPrice
) {
}
