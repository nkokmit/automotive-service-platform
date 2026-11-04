package com.example.staff_service.service;

import com.example.staff_service.dto.request.StaffScheduleExceptionRequest;
import com.example.staff_service.entity.ScheduleExceptionType;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.repository.StaffRecurringScheduleRepository;
import com.example.staff_service.repository.StaffScheduleExceptionRepository;
import com.example.staff_service.repository.WorkShiftRepository;
import com.example.staff_service.security.CurrentActorIdProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StaffScheduleExceptionServiceImplTest {

    @Mock
    private StaffMemberRepository staffMemberRepository;

    @Mock
    private StaffScheduleExceptionRepository exceptionRepository;

    @Mock
    private StaffRecurringScheduleRepository recurringScheduleRepository;

    @Mock
    private WorkShiftRepository workShiftRepository;

    @Mock
    private CurrentActorIdProvider currentActorIdProvider;

    @InjectMocks
    private StaffScheduleExceptionServiceImpl exceptionService;

    @Test
    void createsCancellationOnlyForARecurringShift() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        givenActiveStaff(staffId);
        given(workShiftRepository.findById(shiftId))
                .willReturn(Optional.of(WorkShift.builder().id(shiftId).isActive(false).build()));
        given(recurringScheduleRepository.existsEffectiveSchedule(staffId, shiftId, 1, date))
                .willReturn(true);
        given(exceptionRepository.existsByStaffIdAndShiftIdAndExceptionDate(staffId, shiftId, date))
                .willReturn(false);
        given(exceptionRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));

        var response = exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.CANCEL_SHIFT, null));

        assertThat(response.exceptionType()).isEqualTo(ScheduleExceptionType.CANCEL_SHIFT);
        verify(exceptionRepository).save(any());
    }

    @Test
    void rejectsCancellationWhenNoRecurringShiftExists() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        givenActiveStaff(staffId);
        given(workShiftRepository.findById(shiftId))
                .willReturn(Optional.of(WorkShift.builder().id(shiftId).isActive(true).build()));
        given(recurringScheduleRepository.existsEffectiveSchedule(staffId, shiftId, 1, date))
                .willReturn(false);

        assertThatThrownBy(() -> exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.CANCEL_SHIFT, null)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đã có trong lịch định kỳ");

        org.mockito.Mockito.verify(exceptionRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void createsAdditionalShiftOnlyWhenItIsNotAlreadyScheduledAndActive() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        givenActiveStaff(staffId);
        given(workShiftRepository.findById(shiftId))
                .willReturn(Optional.of(WorkShift.builder().id(shiftId).isActive(true).build()));
        given(recurringScheduleRepository.existsEffectiveSchedule(staffId, shiftId, 1, date))
                .willReturn(false);
        given(exceptionRepository.existsByStaffIdAndShiftIdAndExceptionDate(staffId, shiftId, date))
                .willReturn(false);
        given(exceptionRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));

        var response = exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.ADD_SHIFT, null));

        assertThat(response.exceptionType()).isEqualTo(ScheduleExceptionType.ADD_SHIFT);
        verify(exceptionRepository).save(any());
    }

    @Test
    void rejectsAdditionalShiftWhenItIsAlreadyScheduledOrInactive() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        givenActiveStaff(staffId);
        given(workShiftRepository.findById(shiftId))
                .willReturn(Optional.of(WorkShift.builder().id(shiftId).isActive(true).build()));
        given(recurringScheduleRepository.existsEffectiveSchedule(staffId, shiftId, 1, date))
                .willReturn(true);

        assertThatThrownBy(() -> exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.ADD_SHIFT, null)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đã có trong lịch định kỳ");

        org.mockito.Mockito.verify(exceptionRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void rejectsMoreThanOneExceptionForTheSameStaffShiftAndDate() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        givenActiveStaff(staffId);
        given(workShiftRepository.findById(shiftId))
                .willReturn(Optional.of(WorkShift.builder().id(shiftId).isActive(true).build()));
        given(recurringScheduleRepository.existsEffectiveSchedule(staffId, shiftId, 1, date))
                .willReturn(false);
        given(exceptionRepository.existsByStaffIdAndShiftIdAndExceptionDate(staffId, shiftId, date))
                .willReturn(true);

        assertThatThrownBy(() -> exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.ADD_SHIFT, null)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("một ngoại lệ");

        org.mockito.Mockito.verify(exceptionRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void rejectsAddingAnInactiveShift() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        givenActiveStaff(staffId);
        given(workShiftRepository.findById(shiftId))
                .willReturn(Optional.of(WorkShift.builder().id(shiftId).isActive(false).build()));
        given(recurringScheduleRepository.existsEffectiveSchedule(staffId, shiftId, 1, date))
                .willReturn(false);

        assertThatThrownBy(() -> exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.ADD_SHIFT, null)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("ca làm việc không hoạt động");

        org.mockito.Mockito.verify(exceptionRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void rejectsDuplicateExceptionAndInactiveStaff() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        given(staffMemberRepository.findByIdForUpdate(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).isActive(false).build()));

        assertThatThrownBy(() -> exceptionService.createException(staffId,
                new StaffScheduleExceptionRequest(shiftId, date, ScheduleExceptionType.ADD_SHIFT, null)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("nhân viên không hoạt động");
        verifyNoInteractions(workShiftRepository, recurringScheduleRepository, exceptionRepository);
    }

    private void givenActiveStaff(UUID staffId) {
        given(staffMemberRepository.findByIdForUpdate(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).isActive(true).build()));
    }
}
