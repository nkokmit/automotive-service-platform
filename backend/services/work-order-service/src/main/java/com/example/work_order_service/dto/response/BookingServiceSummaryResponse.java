package com.example.work_order_service.dto.response;

import java.util.UUID;

public record BookingServiceSummaryResponse(
        UUID serviceId,
        String serviceNameSnapshot,
        Integer estimatedDurationMinutes,
        Integer requiredTechniciansSnapshot,
        Integer sequenceNumber
) {
}
