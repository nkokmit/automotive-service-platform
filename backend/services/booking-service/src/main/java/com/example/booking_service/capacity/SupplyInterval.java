package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.UUID;

/** Khoảng làm việc thực tế của một nhân viên, nửa mở {@code [start, end)}. */
public record SupplyInterval(UUID staffId, Instant start, Instant end) {

    public SupplyInterval {
        if (staffId == null) {
            throw new IllegalArgumentException("Khoảng làm việc phải có staffId");
        }
        if (start == null || end == null || !start.isBefore(end)) {
            throw new IllegalArgumentException("Khoảng làm việc phải có start < end");
        }
    }
}
