package com.example.booking_service.integration.staff;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Lịch tổng hợp theo từng nhân viên từ staff-service ({@code GET /api/schedules}).
 * Các khoảng đã trừ nghỉ phép/ngoại lệ ở phía staff-service.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record StaffScheduleContract(UUID staffId, List<Day> days) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Day(List<Interval> intervals) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Interval(Instant startAt, Instant endAt) {
    }
}
