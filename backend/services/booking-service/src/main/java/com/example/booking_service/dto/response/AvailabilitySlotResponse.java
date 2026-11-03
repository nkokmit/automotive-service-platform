package com.example.booking_service.dto.response;

import java.time.Instant;

public record AvailabilitySlotResponse(Instant startAt, Instant endAt) {
}
