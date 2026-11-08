package com.example.work_order_service.dto.response;

import com.example.work_order_service.enums.WorkOrderStatus;

import java.time.Instant;
import java.util.UUID;

public record WorkOrderListItemResponse(
        UUID id,
        String code,
        UUID bookingId,
        UUID customerId,
        UUID vehicleId,
        UUID advisorId,
        WorkOrderStatus status,
        Integer odometerIn,
        Instant createdAt,
        Instant updatedAt
) {
}
