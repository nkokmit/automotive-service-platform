package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.response.InternalStaffCapacityResponse;
import com.example.staff_service.service.StaffScheduleAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * API chỉ dành cho service-to-service (token dịch vụ). Không được route qua api-gateway.
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalStaffCapacityController {

    private final StaffScheduleAggregationService scheduleAggregationService;

    @GetMapping("/schedules")
    @PreAuthorize("hasAuthority('INTERNAL_STAFF_CAPACITY_READ')")
    public ApiResponse<List<InternalStaffCapacityResponse>> getCapacity(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        List<InternalStaffCapacityResponse> result = scheduleAggregationService.getGarageSchedule(from, to).stream()
                .map(schedule -> new InternalStaffCapacityResponse(
                        schedule.staffId(),
                        schedule.days() == null ? List.of() : schedule.days().stream()
                                .map(day -> new InternalStaffCapacityResponse.Day(
                                        day.intervals() == null ? List.of() : day.intervals().stream()
                                                .map(i -> new InternalStaffCapacityResponse.Interval(i.startAt(), i.endAt()))
                                                .toList()))
                                .toList()))
                .toList();
        return ApiResponse.success(result);
    }
}
