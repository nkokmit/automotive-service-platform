package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffScheduleExceptionRequest;
import com.example.staff_service.dto.response.StaffScheduleExceptionResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StaffScheduleExceptionService {

    List<StaffScheduleExceptionResponse> getExceptions(UUID staffId, LocalDate from, LocalDate to);

    StaffScheduleExceptionResponse createException(UUID staffId, StaffScheduleExceptionRequest request);

    StaffScheduleExceptionResponse updateException(
            UUID staffId,
            UUID exceptionId,
            StaffScheduleExceptionRequest request
    );

    void deleteException(UUID staffId, UUID exceptionId);
}
