package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.response.StaffAvailabilityResponse;
import com.example.staff_service.dto.response.StaffScheduleResponse;
import com.example.staff_service.service.StaffScheduleAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StaffScheduleAggregationController {

    private final StaffScheduleAggregationService scheduleAggregationService;

    @GetMapping("/staff/{staffId}/schedules")
    @PreAuthorize("hasAuthority('STAFF_SCHEDULE_READ')")
    public ApiResponse<StaffScheduleResponse> getStaffSchedule(
            @PathVariable UUID staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.success(scheduleAggregationService.getStaffSchedule(staffId, from, to));
    }

    @GetMapping("/schedules")
    @PreAuthorize("hasAuthority('STAFF_SCHEDULE_READ')")
    public ApiResponse<List<StaffScheduleResponse>> getGarageSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.success(scheduleAggregationService.getGarageSchedule(from, to));
    }

    @GetMapping("/staff/availability")
    @PreAuthorize("hasAuthority('STAFF_SCHEDULE_READ')")
    public ApiResponse<List<StaffAvailabilityResponse>> findAvailableStaff(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startAt,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endAt
    ) {
        return ApiResponse.success(scheduleAggregationService.findAvailableStaff(startAt, endAt));
    }
}
