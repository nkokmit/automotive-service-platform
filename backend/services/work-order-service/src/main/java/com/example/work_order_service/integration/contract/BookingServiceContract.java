package com.example.work_order_service.integration.contract;

import java.util.UUID;

public record BookingServiceContract(
        UUID serviceId,
        String serviceNameSnapshot,
        Integer estimatedDurationMinutes,
        Integer requiredTechniciansSnapshot,
        Integer sequenceNumber
) {
}
