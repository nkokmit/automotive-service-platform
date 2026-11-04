package com.example.staff_service.service;

import com.example.staff_service.dto.request.WorkShiftCreateRequest;
import com.example.staff_service.dto.request.WorkShiftUpdateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.WorkShiftResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface WorkShiftService {

    PageResponse<WorkShiftResponse> getWorkShifts(String keyword, Boolean isActive, Pageable pageable);

    WorkShiftResponse getWorkShiftById(UUID id);

    WorkShiftResponse createWorkShift(WorkShiftCreateRequest request);

    WorkShiftResponse updateWorkShift(UUID id, WorkShiftUpdateRequest request);

    WorkShiftResponse updateWorkShiftIsActive(UUID id, Boolean isActive);

    void deleteWorkShift(UUID id);
}
