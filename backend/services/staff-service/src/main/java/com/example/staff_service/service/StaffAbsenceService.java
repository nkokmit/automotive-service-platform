package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffAbsenceRequest;
import com.example.staff_service.dto.response.StaffAbsenceResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StaffAbsenceService {

    List<StaffAbsenceResponse> getAbsences(UUID staffId, Instant from, Instant to);

    StaffAbsenceResponse createAbsence(UUID staffId, StaffAbsenceRequest request);

    StaffAbsenceResponse updateAbsence(UUID staffId, UUID absenceId, StaffAbsenceRequest request);

    void deleteAbsence(UUID staffId, UUID absenceId);
}
