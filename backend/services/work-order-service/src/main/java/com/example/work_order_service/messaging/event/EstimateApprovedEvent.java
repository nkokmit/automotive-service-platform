package com.example.work_order_service.messaging.event;

import com.example.work_order_service.enums.EstimateStatus;

import java.time.Instant;
import java.util.UUID;

public record EstimateApprovedEvent(
        UUID eventId,
        UUID estimateId,
        String estimateCode,
        UUID workOrderId,
        String workOrderCode,
        UUID advisorId,
        EstimateStatus status,
        Instant occurredAt
) {
}
