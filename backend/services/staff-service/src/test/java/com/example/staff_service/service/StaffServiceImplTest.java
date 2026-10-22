package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffCreateRequest;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.StaffAlreadyExistsException;
import com.example.staff_service.exception.StaffNotFoundException;
import com.example.staff_service.exception.StaffUserIdAlreadyExistsException;
import com.example.staff_service.mapper.StaffMapper;
import com.example.staff_service.repository.StaffMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StaffServiceImplTest {

    @Mock
    private StaffMemberRepository staffMemberRepository;

    @Mock
    private StaffMapper staffMapper;

    @InjectMocks
    private StaffServiceImpl staffService;

    @Test
    void createStaffRejectsDuplicateEmployeeCode() {
        StaffCreateRequest request = new StaffCreateRequest(null, "EMP-001", "Nguyen Van A", null, null, null, null);
        given(staffMemberRepository.countByEmployeeCodeIncludingDeleted("EMP-001")).willReturn(1L);

        assertThatThrownBy(() -> staffService.createStaff(request))
                .isInstanceOf(StaffAlreadyExistsException.class)
                .extracting(exception -> ((StaffAlreadyExistsException) exception).getErrorCode())
                .isEqualTo(ErrorCode.STAFF_ALREADY_EXISTS);
        verifyNoInteractions(staffMapper);
    }

    @Test
    void createStaffRejectsUserAlreadyLinkedToAnotherStaff() {
        UUID userId = UUID.randomUUID();
        StaffCreateRequest request = new StaffCreateRequest(
                userId, "EMP-002", "Nguyen Van B", null, null, null, null);
        given(staffMemberRepository.countByEmployeeCodeIncludingDeleted("EMP-002")).willReturn(0L);
        given(staffMemberRepository.countByUserIdIncludingDeleted(userId.toString())).willReturn(1L);

        assertThatThrownBy(() -> staffService.createStaff(request))
                .isInstanceOf(StaffUserIdAlreadyExistsException.class)
                .extracting(exception -> ((StaffUserIdAlreadyExistsException) exception).getErrorCode())
                .isEqualTo(ErrorCode.STAFF_USER_ID_EXISTS);
        verifyNoInteractions(staffMapper);
    }

    @Test
    void getStaffByIdRejectsUnknownStaff() {
        UUID id = UUID.randomUUID();
        given(staffMemberRepository.findById(id)).willReturn(Optional.empty());

        assertThatThrownBy(() -> staffService.getStaffById(id))
                .isInstanceOf(StaffNotFoundException.class)
                .extracting(exception -> ((StaffNotFoundException) exception).getErrorCode())
                .isEqualTo(ErrorCode.STAFF_NOT_FOUND);
    }

    @Test
    void updateStaffIsActivePersistsNewValue() {
        UUID id = UUID.randomUUID();
        StaffMember staffMember = StaffMember.builder().id(id).isActive(true).build();
        given(staffMemberRepository.findById(id)).willReturn(Optional.of(staffMember));
        given(staffMemberRepository.save(any(StaffMember.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(staffMapper.toStaffResponse(staffMember)).willReturn(null);

        staffService.updateStaffIsActive(id, false);

        assertThat(staffMember.getIsActive()).isFalse();
        verify(staffMemberRepository).save(staffMember);
    }

    @Test
    void deleteStaffMarksInactiveAndSoftDeleted() {
        UUID id = UUID.randomUUID();
        StaffMember staffMember = StaffMember.builder().id(id).isActive(true).build();
        given(staffMemberRepository.findByIdIncludingDeleted(id.toString())).willReturn(Optional.of(staffMember));
        given(staffMemberRepository.save(any(StaffMember.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        staffService.deleteStaff(id);

        assertThat(staffMember.getIsActive()).isFalse();
        assertThat(staffMember.getDeletedAt()).isNotNull();
        verify(staffMemberRepository).save(staffMember);
    }

    @Test
    void deleteStaffIsIdempotentForPreviouslyDeletedRecord() {
        UUID id = UUID.randomUUID();
        StaffMember staffMember = StaffMember.builder()
                .id(id)
                .deletedAt(java.time.Instant.parse("2026-01-01T00:00:00Z"))
                .build();
        given(staffMemberRepository.findByIdIncludingDeleted(id.toString())).willReturn(Optional.of(staffMember));

        staffService.deleteStaff(id);

        org.mockito.Mockito.verify(staffMemberRepository, org.mockito.Mockito.never())
                .save(any(StaffMember.class));
    }
}
