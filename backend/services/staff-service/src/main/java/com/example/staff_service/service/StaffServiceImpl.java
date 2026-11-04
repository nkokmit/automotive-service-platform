package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffCreateRequest;
import com.example.staff_service.dto.request.StaffUpdateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.StaffResponse;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.exception.StaffAlreadyExistsException;
import com.example.staff_service.exception.StaffNotFoundException;
import com.example.staff_service.exception.StaffUserIdAlreadyExistsException;
import com.example.staff_service.mapper.StaffMapper;
import com.example.staff_service.repository.StaffMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StaffServiceImpl implements StaffService {

    private final StaffMemberRepository staffMemberRepository;
    private final StaffMapper staffMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StaffResponse> getStaff(String keyword, Boolean isActive, Pageable pageable) {
        Page<StaffMember> page = staffMemberRepository.search(
                normalizeKeyword(keyword), isActive, pageable);
        return PageResponse.from(page, staffMapper::toStaffResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getStaffById(UUID id) {
        return staffMapper.toStaffResponse(findStaff(id));
    }

    @Override
    public StaffResponse createStaff(StaffCreateRequest request) {
        requireEmployeeCodeAvailable(request.employeeCode(), null);
        requireUserIdAvailable(request.userId(), null);

        StaffMember staffMember = StaffMember.builder()
                .userId(request.userId())
                .employeeCode(request.employeeCode().trim())
                .fullName(request.fullName().trim())
                .phone(request.phone())
                .email(request.email())
                .position(request.position())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build();

        StaffMember saved = staffMemberRepository.save(staffMember);
        log.info("Đã tạo hồ sơ nhân viên: employeeCode={}", saved.getEmployeeCode());
        return staffMapper.toStaffResponse(saved);
    }

    @Override
    public StaffResponse updateStaff(UUID id, StaffUpdateRequest request) {
        StaffMember staffMember = findStaff(id);
        requireEmployeeCodeAvailable(request.employeeCode(), id);
        requireUserIdAvailable(request.userId(), id);

        staffMember.setUserId(request.userId());
        staffMember.setEmployeeCode(request.employeeCode().trim());
        staffMember.setFullName(request.fullName().trim());
        staffMember.setPhone(request.phone());
        staffMember.setEmail(request.email());
        staffMember.setPosition(request.position());

        StaffMember saved = staffMemberRepository.save(staffMember);
        log.info("Đã cập nhật hồ sơ nhân viên: id={}", saved.getId());
        return staffMapper.toStaffResponse(saved);
    }

    @Override
    public StaffResponse updateStaffIsActive(UUID id, Boolean isActive) {
        StaffMember staffMember = findStaff(id);
        staffMember.setIsActive(isActive);
        StaffMember saved = staffMemberRepository.save(staffMember);
        log.info("Đã cập nhật isActive nhân viên: id={}, isActive={}", saved.getId(), isActive);
        return staffMapper.toStaffResponse(saved);
    }

    @Override
    public void deleteStaff(UUID id) {
        StaffMember staffMember = staffMemberRepository.findByIdIncludingDeleted(id.toString())
                .orElseThrow(() -> new StaffNotFoundException("Không tìm thấy nhân viên với id: " + id));
        if (staffMember.getDeletedAt() != null) {
            log.info("Hồ sơ nhân viên {} đã được xóa mềm trước đó — bỏ qua", id);
            return;
        }

        staffMember.setIsActive(Boolean.FALSE);
        staffMember.setDeletedAt(Instant.now());
        staffMemberRepository.save(staffMember);
        log.info("Đã xóa mềm hồ sơ nhân viên: id={}", id);
    }

    private StaffMember findStaff(UUID id) {
        return staffMemberRepository.findById(id)
                .orElseThrow(() -> new StaffNotFoundException("Không tìm thấy nhân viên với id: " + id));
    }

    private void requireEmployeeCodeAvailable(String employeeCode, UUID currentId) {
        boolean exists = currentId == null
                ? staffMemberRepository.countByEmployeeCodeIncludingDeleted(employeeCode.trim()) > 0
                : staffMemberRepository.countByEmployeeCodeExcludingIdIncludingDeleted(
                        employeeCode.trim(), currentId.toString()) > 0;
        if (exists) {
            throw new StaffAlreadyExistsException("Mã nhân viên đã tồn tại: " + employeeCode);
        }
    }

    private void requireUserIdAvailable(UUID userId, UUID currentId) {
        boolean exists = userId != null && (currentId == null
                ? staffMemberRepository.countByUserIdIncludingDeleted(userId.toString()) > 0
                : staffMemberRepository.countByUserIdExcludingIdIncludingDeleted(
                        userId.toString(), currentId.toString()) > 0);
        if (exists) {
            throw new StaffUserIdAlreadyExistsException(
                    "Tài khoản đã được liên kết với hồ sơ nhân viên khác");
        }
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null || keyword.isBlank() ? null : keyword.trim();
    }
}
