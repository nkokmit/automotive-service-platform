package com.example.staff_service.service;

import com.example.staff_service.dto.request.WorkShiftCreateRequest;
import com.example.staff_service.dto.request.WorkShiftUpdateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.WorkShiftResponse;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.WorkShiftAlreadyExistsException;
import com.example.staff_service.exception.WorkShiftNotFoundException;
import com.example.staff_service.mapper.WorkShiftMapper;
import com.example.staff_service.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WorkShiftServiceImpl implements WorkShiftService {

    private final WorkShiftRepository workShiftRepository;
    private final WorkShiftMapper workShiftMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WorkShiftResponse> getWorkShifts(
            String keyword,
            Boolean isActive,
            Pageable pageable
    ) {
        Page<WorkShift> page = workShiftRepository.search(
                keyword == null || keyword.isBlank() ? null : keyword.trim(),
                isActive,
                pageable);
        return PageResponse.from(page, workShiftMapper::toWorkShiftResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkShiftResponse getWorkShiftById(UUID id) {
        return workShiftMapper.toWorkShiftResponse(findWorkShift(id));
    }

    @Override
    public WorkShiftResponse createWorkShift(WorkShiftCreateRequest request) {
        validateTimeRange(request.startTime(), request.endTime());
        requireCodeAvailable(request.code(), null);

        WorkShift workShift = WorkShift.builder()
                .code(request.code().trim())
                .name(request.name().trim())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build();

        WorkShift saved = workShiftRepository.save(workShift);
        log.info("Đã tạo ca làm việc: code={}", saved.getCode());
        return workShiftMapper.toWorkShiftResponse(saved);
    }

    @Override
    public WorkShiftResponse updateWorkShift(UUID id, WorkShiftUpdateRequest request) {
        validateTimeRange(request.startTime(), request.endTime());
        WorkShift workShift = findWorkShift(id);
        requireCodeAvailable(request.code(), id);

        workShift.setCode(request.code().trim());
        workShift.setName(request.name().trim());
        workShift.setStartTime(request.startTime());
        workShift.setEndTime(request.endTime());

        WorkShift saved = workShiftRepository.save(workShift);
        log.info("Đã cập nhật ca làm việc: id={}", saved.getId());
        return workShiftMapper.toWorkShiftResponse(saved);
    }

    @Override
    public WorkShiftResponse updateWorkShiftIsActive(UUID id, Boolean isActive) {
        WorkShift workShift = findWorkShift(id);
        workShift.setIsActive(isActive);
        WorkShift saved = workShiftRepository.save(workShift);
        log.info("Đã cập nhật isActive ca làm: id={}, isActive={}", saved.getId(), isActive);
        return workShiftMapper.toWorkShiftResponse(saved);
    }

    @Override
    public void deleteWorkShift(UUID id) {
        String idValue = id.toString();
        WorkShift workShift = workShiftRepository.findByIdIncludingDeleted(idValue)
                .orElseThrow(() -> new WorkShiftNotFoundException("Không tìm thấy ca làm việc với id: " + id));
        if (workShift.getDeletedAt() != null) {
            log.info("Ca làm việc {} đã được xóa mềm trước đó — bỏ qua", id);
            return;
        }
        if (workShiftRepository.countScheduleReferences(idValue) > 0) {
            throw new ApiException(ErrorCode.WORK_SHIFT_IN_USE,
                    "Ca làm việc đã được dùng trong lịch; hãy đặt isActive=false thay vì xóa");
        }

        workShift.setIsActive(Boolean.FALSE);
        workShift.setDeletedAt(Instant.now());
        workShiftRepository.save(workShift);
        log.info("Đã xóa mềm ca làm việc: id={}", id);
    }

    private WorkShift findWorkShift(UUID id) {
        return workShiftRepository.findById(id)
                .orElseThrow(() -> new WorkShiftNotFoundException("Không tìm thấy ca làm việc với id: " + id));
    }

    private void requireCodeAvailable(String code, UUID currentId) {
        boolean exists = currentId == null
                ? workShiftRepository.countByCodeIncludingDeleted(code.trim()) > 0
                : workShiftRepository.countByCodeExcludingIdIncludingDeleted(code.trim(), currentId.toString()) > 0;
        if (exists) {
            throw new WorkShiftAlreadyExistsException("Mã ca làm việc đã tồn tại: " + code);
        }
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Giờ bắt đầu phải trước giờ kết thúc trong cùng ngày");
        }
    }
}
