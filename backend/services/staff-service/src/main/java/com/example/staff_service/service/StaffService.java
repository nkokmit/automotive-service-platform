package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffCreateRequest;
import com.example.staff_service.dto.request.StaffUpdateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.StaffResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface StaffService {

    PageResponse<StaffResponse> getStaff(String keyword, Boolean isActive, Pageable pageable);

    StaffResponse getStaffById(UUID id);

    StaffResponse createStaff(StaffCreateRequest request);

    StaffResponse updateStaff(UUID id, StaffUpdateRequest request);

    StaffResponse updateStaffIsActive(UUID id, Boolean isActive);

    void deleteStaff(UUID id);
}
