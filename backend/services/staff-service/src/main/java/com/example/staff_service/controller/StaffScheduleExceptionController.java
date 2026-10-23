package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.request.StaffScheduleExceptionRequest;
import com.example.staff_service.dto.response.StaffScheduleExceptionResponse;
import com.example.staff_service.service.StaffScheduleExceptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/{staffId}/schedule-exceptions")
@RequiredArgsConstructor
@Validated
public class StaffScheduleExceptionController {

    private final StaffScheduleExceptionService exceptionService;

    @GetMapping
    public ApiResponse<List<StaffScheduleExceptionResponse>> getExceptions(
            @PathVariable UUID staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.success(exceptionService.getExceptions(staffId, from, to));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StaffScheduleExceptionResponse> createException(
            @PathVariable UUID staffId,
            @Valid @RequestBody StaffScheduleExceptionRequest request
    ) {
        return ApiResponse.success("Tạo ngoại lệ lịch thành công",
                exceptionService.createException(staffId, request));
    }

    @PutMapping("/{exceptionId}")
    public ApiResponse<StaffScheduleExceptionResponse> updateException(
            @PathVariable UUID staffId,
            @PathVariable UUID exceptionId,
            @Valid @RequestBody StaffScheduleExceptionRequest request
    ) {
        return ApiResponse.success("Cập nhật ngoại lệ lịch thành công",
                exceptionService.updateException(staffId, exceptionId, request));
    }

    @DeleteMapping("/{exceptionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteException(
            @PathVariable UUID staffId,
            @PathVariable UUID exceptionId
    ) {
        exceptionService.deleteException(staffId, exceptionId);
    }
}
