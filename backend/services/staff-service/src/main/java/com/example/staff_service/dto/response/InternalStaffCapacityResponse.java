package com.example.staff_service.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Dữ liệu sức chứa tối thiểu cho service nội bộ: không có tên, mã nhân viên hay thông tin ca.
 */
public record InternalStaffCapacityResponse(UUID staffId, List<Day> days) {

    public record Day(List<Interval> intervals) {
    }

    public record Interval(Instant startAt, Instant endAt) {
    }
}
