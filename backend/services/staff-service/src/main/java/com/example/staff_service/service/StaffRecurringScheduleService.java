package com.example.staff_service.service;

import com.example.staff_service.dto.request.RecurringScheduleReplaceRequest;
import com.example.staff_service.dto.response.StaffRecurringScheduleResponse;

import java.util.List;
import java.util.UUID;

public interface StaffRecurringScheduleService {

    List<StaffRecurringScheduleResponse> getRecurringSchedules(UUID staffId);

    List<StaffRecurringScheduleResponse> replaceRecurringSchedules(
            UUID staffId,
            RecurringScheduleReplaceRequest request
    );
}
