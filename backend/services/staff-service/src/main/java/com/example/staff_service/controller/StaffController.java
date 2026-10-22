package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.request.StaffCreateRequest;
import com.example.staff_service.dto.request.IsActiveUpdateRequest;
import com.example.staff_service.dto.request.StaffUpdateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.StaffResponse;
import com.example.staff_service.service.StaffService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@Validated
public class StaffController {

    private final StaffService staffService;

    @GetMapping
    public ApiResponse<PageResponse<StaffResponse>> getStaff(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(staffService.getStaff(keyword, isActive, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<StaffResponse> getStaffById(@PathVariable UUID id) {
        return ApiResponse.success(staffService.getStaffById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StaffResponse> createStaff(@Valid @RequestBody StaffCreateRequest request) {
        return ApiResponse.success("Tạo hồ sơ nhân viên thành công", staffService.createStaff(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<StaffResponse> updateStaff(
            @PathVariable UUID id,
            @Valid @RequestBody StaffUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật hồ sơ nhân viên thành công", staffService.updateStaff(id, request));
    }

    @PatchMapping("/{id}/is-active")
    public ApiResponse<StaffResponse> updateStaffIsActive(
            @PathVariable UUID id,
            @Valid @RequestBody IsActiveUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật isActive nhân viên thành công",
                staffService.updateStaffIsActive(id, request.isActive()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStaff(@PathVariable UUID id) {
        staffService.deleteStaff(id);
    }
}
