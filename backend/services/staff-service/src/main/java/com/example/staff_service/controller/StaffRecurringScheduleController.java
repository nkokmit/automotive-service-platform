package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.request.RecurringScheduleReplaceRequest;
import com.example.staff_service.dto.response.StaffRecurringScheduleResponse;
import com.example.staff_service.service.StaffRecurringScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/{staffId}/recurring-schedules")
@RequiredArgsConstructor
public class StaffRecurringScheduleController {

    private final StaffRecurringScheduleService recurringScheduleService;

    @GetMapping
    @PreAuthorize("hasAuthority('STAFF_SCHEDULE_READ')")
    public ApiResponse<List<StaffRecurringScheduleResponse>> getRecurringSchedules(
            @PathVariable UUID staffId
    ) {
        return ApiResponse.success(recurringScheduleService.getRecurringSchedules(staffId));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('STAFF_SCHEDULE_UPDATE')")
    public ApiResponse<List<StaffRecurringScheduleResponse>> replaceRecurringSchedules(
            @PathVariable UUID staffId,
            @Valid @RequestBody RecurringScheduleReplaceRequest request
    ) {
        return ApiResponse.success("Cập nhật lịch định kỳ thành công",
                recurringScheduleService.replaceRecurringSchedules(staffId, request));
    }
}
