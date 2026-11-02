package com.example.booking_service.capacity;

import java.time.Instant;

/** Nhu cầu kỹ thuật viên trên khoảng nửa mở {@code [start, end)}. */
public record DemandInterval(Instant start, Instant end, int technicians) {

    public DemandInterval {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new IllegalArgumentException("Khoảng nhu cầu phải có start < end");
        }
        if (technicians < 1) {
            throw new IllegalArgumentException("Số kỹ thuật viên phải >= 1");
        }
    }
}
