package com.example.staff_service.service;

import com.example.staff_service.dto.response.StaffAvailabilityResponse;
import com.example.staff_service.dto.response.StaffScheduleResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StaffScheduleAggregationService {

    StaffScheduleResponse getStaffSchedule(UUID staffId, LocalDate from, LocalDate to);

    List<StaffScheduleResponse> getGarageSchedule(LocalDate from, LocalDate to);

    List<StaffAvailabilityResponse> findAvailableStaff(Instant startAt, Instant endAt);
}
