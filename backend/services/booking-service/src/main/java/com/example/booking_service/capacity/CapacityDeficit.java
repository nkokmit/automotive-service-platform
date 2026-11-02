package com.example.booking_service.capacity;

import java.time.Instant;

/** Một đoạn {@code [start, end)} mà tổng nhu cầu vượt nguồn cung. */
public record CapacityDeficit(Instant start, Instant end, int demand, int supply) {
}
