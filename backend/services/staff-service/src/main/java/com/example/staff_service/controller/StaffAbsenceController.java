package com.example.staff_service.controller;

import com.example.staff_service.common.ApiResponse;
import com.example.staff_service.dto.request.StaffAbsenceRequest;
import com.example.staff_service.dto.response.StaffAbsenceResponse;
import com.example.staff_service.service.StaffAbsenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/{staffId}/absences")
@RequiredArgsConstructor
@Validated
public class StaffAbsenceController {

    private final StaffAbsenceService absenceService;

    @GetMapping
    @PreAuthorize("hasAuthority('STAFF_ABSENCE_READ')")
    public ApiResponse<List<StaffAbsenceResponse>> getAbsences(
            @PathVariable UUID staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return ApiResponse.success(absenceService.getAbsences(staffId, from, to));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('STAFF_ABSENCE_CREATE')")
    public ApiResponse<StaffAbsenceResponse> createAbsence(
            @PathVariable UUID staffId,
            @Valid @RequestBody StaffAbsenceRequest request
    ) {
        return ApiResponse.success("Ghi nhận khoảng nghỉ thành công",
                absenceService.createAbsence(staffId, request));
    }

    @PutMapping("/{absenceId}")
    @PreAuthorize("hasAuthority('STAFF_ABSENCE_UPDATE')")
    public ApiResponse<StaffAbsenceResponse> updateAbsence(
            @PathVariable UUID staffId,
            @PathVariable UUID absenceId,
            @Valid @RequestBody StaffAbsenceRequest request
    ) {
        return ApiResponse.success("Cập nhật khoảng nghỉ thành công",
                absenceService.updateAbsence(staffId, absenceId, request));
    }

    @DeleteMapping("/{absenceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('STAFF_ABSENCE_DELETE')")
    public void deleteAbsence(
            @PathVariable UUID staffId,
            @PathVariable UUID absenceId
    ) {
        absenceService.deleteAbsence(staffId, absenceId);
    }
}
