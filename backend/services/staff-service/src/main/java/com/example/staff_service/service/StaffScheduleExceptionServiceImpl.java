package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffScheduleExceptionRequest;
import com.example.staff_service.dto.response.StaffScheduleExceptionResponse;
import com.example.staff_service.entity.ScheduleExceptionType;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.entity.StaffScheduleException;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.StaffNotFoundException;
import com.example.staff_service.exception.StaffScheduleExceptionNotFoundException;
import com.example.staff_service.exception.WorkShiftNotFoundException;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.repository.StaffRecurringScheduleRepository;
import com.example.staff_service.repository.StaffScheduleExceptionRepository;
import com.example.staff_service.repository.WorkShiftRepository;
import com.example.staff_service.security.CurrentActorIdProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StaffScheduleExceptionServiceImpl implements StaffScheduleExceptionService {

    private final StaffMemberRepository staffMemberRepository;
    private final StaffScheduleExceptionRepository exceptionRepository;
    private final StaffRecurringScheduleRepository recurringScheduleRepository;
    private final WorkShiftRepository workShiftRepository;
    private final CurrentActorIdProvider currentActorIdProvider;

    @Override
    @Transactional(readOnly = true)
    public List<StaffScheduleExceptionResponse> getExceptions(UUID staffId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        requireStaff(staffId);
        return exceptionRepository
                .findByStaffIdAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(staffId, from, to)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public StaffScheduleExceptionResponse createException(
            UUID staffId,
            StaffScheduleExceptionRequest request
    ) {
        validateRequest(request);
        StaffMember staff = requireActiveStaffForUpdate(staffId);
        WorkShift shift = requireShift(request.shiftId());
        validateTypeAgainstSchedule(staffId, request, shift);
        if (exceptionRepository.existsByStaffIdAndShiftIdAndExceptionDate(
                staffId, request.shiftId(), request.exceptionDate())) {
            throw duplicateException();
        }

        StaffScheduleException exception = StaffScheduleException.builder()
                .staffId(staffId)
                .shiftId(request.shiftId())
                .exceptionDate(request.exceptionDate())
                .exceptionType(request.exceptionType())
                .reason(request.reason())
                .createdBy(currentActorIdProvider.getCurrentUserId())
                .build();
        StaffScheduleException saved = exceptionRepository.save(exception);
        log.info("Đã tạo ngoại lệ lịch: staffId={}, exceptionId={}, type={}",
                staff.getId(), saved.getId(), saved.getExceptionType());
        return toResponse(saved);
    }

    @Override
    public StaffScheduleExceptionResponse updateException(
            UUID staffId,
            UUID exceptionId,
            StaffScheduleExceptionRequest request
    ) {
        validateRequest(request);
        StaffMember staff = requireActiveStaffForUpdate(staffId);
        StaffScheduleException exception = findException(staffId, exceptionId);
        WorkShift shift = requireShift(request.shiftId());
        validateTypeAgainstSchedule(staffId, request, shift);
        if (exceptionRepository.existsByStaffIdAndShiftIdAndExceptionDateAndIdNot(
                staffId, request.shiftId(), request.exceptionDate(), exceptionId)) {
            throw duplicateException();
        }

        exception.setShiftId(request.shiftId());
        exception.setExceptionDate(request.exceptionDate());
        exception.setExceptionType(request.exceptionType());
        exception.setReason(request.reason());
        StaffScheduleException saved = exceptionRepository.save(exception);
        log.info("Đã cập nhật ngoại lệ lịch: staffId={}, exceptionId={}", staff.getId(), exceptionId);
        return toResponse(saved);
    }

    @Override
    public void deleteException(UUID staffId, UUID exceptionId) {
        requireStaff(staffId);
        StaffScheduleException exception = findException(staffId, exceptionId);
        exceptionRepository.delete(exception);
        log.info("Đã xóa ngoại lệ lịch: staffId={}, exceptionId={}", staffId, exceptionId);
    }

    private void validateRequest(StaffScheduleExceptionRequest request) {
        if (request == null || request.shiftId() == null || request.exceptionDate() == null
                || request.exceptionType() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Ca làm việc, ngày và loại ngoại lệ là bắt buộc");
        }
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Khoảng tra cứu phải có from bằng hoặc trước to");
        }
    }

    private StaffMember requireActiveStaffForUpdate(UUID staffId) {
        StaffMember staff = staffMemberRepository.findByIdForUpdate(staffId)
                .orElseThrow(() -> new StaffNotFoundException(
                        "Không tìm thấy nhân viên với id: " + staffId));
        if (!Boolean.TRUE.equals(staff.getIsActive())) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Không thể tạo hoặc cập nhật ngoại lệ cho nhân viên không hoạt động");
        }
        return staff;
    }

    private void requireStaff(UUID staffId) {
        staffMemberRepository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException(
                        "Không tìm thấy nhân viên với id: " + staffId));
    }

    private WorkShift requireShift(UUID shiftId) {
        return workShiftRepository.findById(shiftId)
                .orElseThrow(() -> new WorkShiftNotFoundException(
                        "Không tìm thấy ca làm việc với id: " + shiftId));
    }

    private void validateTypeAgainstSchedule(
            UUID staffId,
            StaffScheduleExceptionRequest request,
            WorkShift shift
    ) {
        boolean scheduled = recurringScheduleRepository.existsEffectiveSchedule(
                staffId,
                request.shiftId(),
                request.exceptionDate().getDayOfWeek().getValue(),
                request.exceptionDate());
        if (request.exceptionType() == ScheduleExceptionType.CANCEL_SHIFT && !scheduled) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Chỉ có thể hủy ca đã có trong lịch định kỳ của ngày đó");
        }
        if (request.exceptionType() == ScheduleExceptionType.ADD_SHIFT) {
            if (scheduled) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Không thể thêm ca đã có trong lịch định kỳ của ngày đó");
            }
            if (!Boolean.TRUE.equals(shift.getIsActive())) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Không thể thêm ca làm việc không hoạt động");
            }
        }
    }

    private StaffScheduleException findException(UUID staffId, UUID exceptionId) {
        return exceptionRepository.findByIdAndStaffId(exceptionId, staffId)
                .orElseThrow(() -> new StaffScheduleExceptionNotFoundException(
                        "Không tìm thấy ngoại lệ lịch với id: " + exceptionId));
    }

    private ApiException duplicateException() {
        return new ApiException(ErrorCode.INVALID_REQUEST,
                "Mỗi ca chỉ được có một ngoại lệ trong cùng một ngày");
    }

    private StaffScheduleExceptionResponse toResponse(StaffScheduleException exception) {
        return new StaffScheduleExceptionResponse(
                exception.getId(),
                exception.getStaffId(),
                exception.getShiftId(),
                exception.getExceptionDate(),
                exception.getExceptionType(),
                exception.getReason(),
                exception.getCreatedBy(),
                exception.getCreatedAt(),
                exception.getUpdatedAt());
    }
}
