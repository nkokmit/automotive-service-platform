package com.example.staff_service.service;

import com.example.staff_service.dto.request.WorkShiftCreateRequest;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.WorkShiftAlreadyExistsException;
import com.example.staff_service.mapper.WorkShiftMapper;
import com.example.staff_service.repository.WorkShiftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class WorkShiftServiceImplTest {

    @Mock
    private WorkShiftRepository workShiftRepository;

    @Mock
    private WorkShiftMapper workShiftMapper;

    @InjectMocks
    private WorkShiftServiceImpl workShiftService;

    @Test
    void createWorkShiftRejectsOvernightShift() {
        WorkShiftCreateRequest request = new WorkShiftCreateRequest(
                "NIGHT", "Ca qua đêm", LocalTime.of(22, 0), LocalTime.of(6, 0), true);

        assertThatThrownBy(() -> workShiftService.createWorkShift(request))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REQUEST);
        verifyNoInteractions(workShiftRepository);
    }

    @Test
    void createWorkShiftRejectsDuplicateCode() {
        WorkShiftCreateRequest request = new WorkShiftCreateRequest(
                "MORNING", "Ca sáng", LocalTime.of(8, 0), LocalTime.of(12, 0), true);
        given(workShiftRepository.countByCodeIncludingDeleted("MORNING")).willReturn(1L);

        assertThatThrownBy(() -> workShiftService.createWorkShift(request))
                .isInstanceOf(WorkShiftAlreadyExistsException.class)
                .extracting(exception -> ((WorkShiftAlreadyExistsException) exception).getErrorCode())
                .isEqualTo(ErrorCode.WORK_SHIFT_ALREADY_EXISTS);
    }

    @Test
    void createWorkShiftDefaultsIsActiveToTrue() {
        WorkShiftCreateRequest request = new WorkShiftCreateRequest(
                "MORNING", "Ca sáng", LocalTime.of(8, 0), LocalTime.of(12, 0), null);
        given(workShiftRepository.countByCodeIncludingDeleted("MORNING")).willReturn(0L);
        given(workShiftRepository.save(any(WorkShift.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        workShiftService.createWorkShift(request);

        org.mockito.ArgumentCaptor<WorkShift> captor = org.mockito.ArgumentCaptor.forClass(WorkShift.class);
        org.mockito.Mockito.verify(workShiftRepository).save(captor.capture());
        assertThat(captor.getValue().getIsActive()).isTrue();
    }

    @Test
    void deleteWorkShiftRejectsShiftAlreadyReferencedBySchedules() {
        var id = java.util.UUID.randomUUID();
        WorkShift shift = WorkShift.builder().id(id).build();
        given(workShiftRepository.findByIdIncludingDeleted(id.toString())).willReturn(java.util.Optional.of(shift));
        given(workShiftRepository.countScheduleReferences(id.toString())).willReturn(1L);

        assertThatThrownBy(() -> workShiftService.deleteWorkShift(id))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getErrorCode())
                .isEqualTo(ErrorCode.WORK_SHIFT_IN_USE);

        org.mockito.Mockito.verify(workShiftRepository, org.mockito.Mockito.never())
                .save(any(WorkShift.class));
    }

    @Test
    void deleteUnusedWorkShiftSoftDeletesIt() {
        var id = java.util.UUID.randomUUID();
        WorkShift shift = WorkShift.builder().id(id).isActive(true).build();
        given(workShiftRepository.findByIdIncludingDeleted(id.toString())).willReturn(java.util.Optional.of(shift));
        given(workShiftRepository.countScheduleReferences(id.toString())).willReturn(0L);
        given(workShiftRepository.save(any(WorkShift.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        workShiftService.deleteWorkShift(id);

        assertThat(shift.getIsActive()).isFalse();
        assertThat(shift.getDeletedAt()).isNotNull();
        org.mockito.Mockito.verify(workShiftRepository).save(shift);
    }
}
