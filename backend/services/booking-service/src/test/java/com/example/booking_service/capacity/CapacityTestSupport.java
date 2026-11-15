package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.UUID;

/** Tiện ích dựng dữ liệu cho test sức chứa. Mốc 0 là 2026-11-02T00:00:00Z. */
final class CapacityTestSupport {

    private static final Instant DAY = Instant.parse("2026-11-02T00:00:00Z");

    private CapacityTestSupport() {
    }

    static Instant at(int hour, int minute) {
        return DAY.plusSeconds(hour * 3600L + minute * 60L);
    }

    /** Giờ trong ngày kế tiếp, dùng cho kịch bản qua nửa đêm. */
    static Instant nextDay(int hour, int minute) {
        return at(hour, minute).plusSeconds(24 * 3600L);
    }

    static SupplyInterval shift(UUID staff, Instant start, Instant end) {
        return new SupplyInterval(staff, start, end);
    }

    static DemandInterval demand(Instant start, Instant end, int technicians) {
        return new DemandInterval(start, end, technicians);
    }
}
