package com.example.booking_service.dto.response;

import java.util.UUID;

public record BookingServiceResponse(
        UUID serviceId,
        String serviceNameSnapshot,
        Integer estimatedDurationMinutes,
        Integer requiredTechniciansSnapshot,
        Integer sequenceNumber
) {
}
