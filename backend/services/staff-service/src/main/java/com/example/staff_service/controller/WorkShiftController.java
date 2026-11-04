package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.request.IsActiveUpdateRequest;
import com.example.staff_service.dto.request.WorkShiftCreateRequest;
import com.example.staff_service.dto.request.WorkShiftUpdateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.WorkShiftResponse;
import com.example.staff_service.service.WorkShiftService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/work-shifts")
@RequiredArgsConstructor
@Validated
public class WorkShiftController {

    private final WorkShiftService workShiftService;

    @GetMapping
    @PreAuthorize("hasAuthority('WORK_SHIFT_READ')")
    public ApiResponse<PageResponse<WorkShiftResponse>> getWorkShifts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "startTime") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(workShiftService.getWorkShifts(keyword, isActive, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('WORK_SHIFT_READ')")
    public ApiResponse<WorkShiftResponse> getWorkShiftById(@PathVariable UUID id) {
        return ApiResponse.success(workShiftService.getWorkShiftById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('WORK_SHIFT_CREATE')")
    public ApiResponse<WorkShiftResponse> createWorkShift(@Valid @RequestBody WorkShiftCreateRequest request) {
        return ApiResponse.success("Tạo ca làm việc thành công", workShiftService.createWorkShift(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('WORK_SHIFT_UPDATE')")
    public ApiResponse<WorkShiftResponse> updateWorkShift(
            @PathVariable UUID id,
            @Valid @RequestBody WorkShiftUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật ca làm việc thành công",
                workShiftService.updateWorkShift(id, request));
    }

    @PatchMapping("/{id}/is-active")
    @PreAuthorize("hasAuthority('WORK_SHIFT_UPDATE')")
    public ApiResponse<WorkShiftResponse> updateWorkShiftIsActive(
            @PathVariable UUID id,
            @Valid @RequestBody IsActiveUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật isActive ca làm thành công",
                workShiftService.updateWorkShiftIsActive(id, request.isActive()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('WORK_SHIFT_DELETE')")
    public void deleteWorkShift(@PathVariable UUID id) {
        workShiftService.deleteWorkShift(id);
    }
}
