package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffAbsenceRequest;
import com.example.staff_service.dto.response.StaffAbsenceResponse;
import com.example.staff_service.entity.StaffAbsence;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.StaffAbsenceNotFoundException;
import com.example.staff_service.exception.StaffNotFoundException;
import com.example.staff_service.repository.StaffAbsenceRepository;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.security.CurrentActorIdProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StaffAbsenceServiceImpl implements StaffAbsenceService {

    private final StaffMemberRepository staffMemberRepository;
    private final StaffAbsenceRepository absenceRepository;
    private final CurrentActorIdProvider currentActorIdProvider;

    @Override
    @Transactional(readOnly = true)
    public List<StaffAbsenceResponse> getAbsences(UUID staffId, Instant from, Instant to) {
        validateRange(from, to);
        requireStaff(staffId);
        return absenceRepository
                .findByStaffIdAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(staffId, to, from)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public StaffAbsenceResponse createAbsence(UUID staffId, StaffAbsenceRequest request) {
        validateRequest(request);
        requireStaff(staffId);
        StaffAbsence absence = StaffAbsence.builder()
                .staffId(staffId)
                .startAt(request.startAt())
                .endAt(request.endAt())
                .absenceType(request.absenceType().trim())
                .reason(request.reason())
                .recordedBy(currentActorIdProvider.getCurrentUserId())
                .build();
        StaffAbsence saved = absenceRepository.save(absence);
        log.info("Đã ghi nhận khoảng nghỉ: staffId={}, absenceId={}", staffId, saved.getId());
        return toResponse(saved);
    }

    @Override
    public StaffAbsenceResponse updateAbsence(
            UUID staffId,
            UUID absenceId,
            StaffAbsenceRequest request
    ) {
        validateRequest(request);
        requireStaff(staffId);
        StaffAbsence absence = findAbsence(staffId, absenceId);
        absence.setStartAt(request.startAt());
        absence.setEndAt(request.endAt());
        absence.setAbsenceType(request.absenceType().trim());
        absence.setReason(request.reason());
        StaffAbsence saved = absenceRepository.save(absence);
        log.info("Đã cập nhật khoảng nghỉ: staffId={}, absenceId={}", staffId, absenceId);
        return toResponse(saved);
    }

    @Override
    public void deleteAbsence(UUID staffId, UUID absenceId) {
        requireStaff(staffId);
        StaffAbsence absence = findAbsence(staffId, absenceId);
        absenceRepository.delete(absence);
        log.info("Đã xóa khoảng nghỉ: staffId={}, absenceId={}", staffId, absenceId);
    }

    private void validateRequest(StaffAbsenceRequest request) {
        if (request == null || request.startAt() == null || request.endAt() == null
                || request.absenceType() == null || request.absenceType().isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Thời gian bắt đầu, kết thúc và loại nghỉ là bắt buộc");
        }
        if (!request.startAt().isBefore(request.endAt())) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Thời điểm bắt đầu nghỉ phải trước thời điểm kết thúc");
        }
        if (request.absenceType().trim().length() > 50) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Loại nghỉ tối đa 50 ký tự");
        }
    }

    private void validateRange(Instant from, Instant to) {
        if (from == null || to == null || !from.isBefore(to)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Khoảng tra cứu phải có from trước to");
        }
    }

    private StaffAbsence findAbsence(UUID staffId, UUID absenceId) {
        return absenceRepository.findByIdAndStaffId(absenceId, staffId)
                .orElseThrow(() -> new StaffAbsenceNotFoundException(
                        "Không tìm thấy khoảng nghỉ với id: " + absenceId));
    }

    private void requireStaff(UUID staffId) {
        staffMemberRepository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException(
                        "Không tìm thấy nhân viên với id: " + staffId));
    }

    private StaffAbsenceResponse toResponse(StaffAbsence absence) {
        return new StaffAbsenceResponse(
                absence.getId(),
                absence.getStaffId(),
                absence.getStartAt(),
                absence.getEndAt(),
                absence.getAbsenceType(),
                absence.getReason(),
                absence.getRecordedBy(),
                absence.getCreatedAt());
    }
}
