package com.example.staff_service.service;

import com.example.staff_service.dto.request.RecurringScheduleDayRequest;
import com.example.staff_service.dto.request.RecurringScheduleReplaceRequest;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.entity.StaffRecurringSchedule;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.repository.StaffRecurringScheduleRepository;
import com.example.staff_service.repository.WorkShiftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StaffRecurringScheduleServiceImplTest {

    @Mock
    private StaffMemberRepository staffMemberRepository;

    @Mock
    private StaffRecurringScheduleRepository scheduleRepository;

    @Mock
    private WorkShiftRepository workShiftRepository;

    @InjectMocks
    private StaffRecurringScheduleServiceImpl scheduleService;

    @Test
    void replaceSchedulesKeepsExistingPartsOutsideRequestedRange() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        StaffMember staff = StaffMember.builder().id(staffId).isActive(true).build();
        StaffRecurringSchedule existing = schedule(staffId, shiftId, 1,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30));
        RecurringScheduleReplaceRequest request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 10),
                LocalDate.of(2026, 11, 20),
                List.of(new RecurringScheduleDayRequest(DayOfWeek.MONDAY, List.of(shiftId))));
        given(staffMemberRepository.findByIdForUpdate(staffId)).willReturn(Optional.of(staff));
        given(workShiftRepository.findAllById(List.of(shiftId)))
                .willReturn(List.of(WorkShift.builder().id(shiftId).isActive(true).build()));
        stubSchedulePersistence(staffId, List.of(existing));

        var result = scheduleService.replaceRecurringSchedules(staffId, request);

        assertThat(result).hasSize(3);
        assertThat(result).extracting("effectiveFrom").containsExactlyInAnyOrder(
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 21),
                LocalDate.of(2026, 11, 10));
        assertThat(result).extracting("effectiveTo").containsExactlyInAnyOrder(
                LocalDate.of(2026, 11, 9),
                LocalDate.of(2026, 11, 30),
                LocalDate.of(2026, 11, 20));
        verify(scheduleRepository).deleteAll(List.of(existing));
        verify(scheduleRepository).flush();
    }

    @Test
    void replaceSchedulesWithEmptyPayloadClearsOnlyRequestedRange() {
        UUID staffId = UUID.randomUUID();
        StaffMember staff = StaffMember.builder().id(staffId).isActive(true).build();
        StaffRecurringSchedule existing = schedule(staffId, UUID.randomUUID(), 1,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30));
        RecurringScheduleReplaceRequest request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 20), List.of());
        given(staffMemberRepository.findByIdForUpdate(staffId)).willReturn(Optional.of(staff));
        stubSchedulePersistence(staffId, List.of(existing));

        var result = scheduleService.replaceRecurringSchedules(staffId, request);

        assertThat(result).hasSize(2);
        assertThat(result).extracting("effectiveFrom").containsExactlyInAnyOrder(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 21));
        assertThat(result).extracting("effectiveTo").containsExactlyInAnyOrder(
                LocalDate.of(2026, 11, 9), LocalDate.of(2026, 11, 30));
        verifyNoInteractions(workShiftRepository);
    }

    @Test
    void replaceSchedulesWithOpenEndedRangePreservesOnlyEarlierPart() {
        UUID staffId = UUID.randomUUID();
        StaffMember staff = StaffMember.builder().id(staffId).isActive(true).build();
        StaffRecurringSchedule existing = schedule(staffId, UUID.randomUUID(), 1,
                LocalDate.of(2026, 11, 1), null);
        RecurringScheduleReplaceRequest request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 10), null, List.of());
        given(staffMemberRepository.findByIdForUpdate(staffId)).willReturn(Optional.of(staff));
        stubSchedulePersistence(staffId, List.of(existing));

        var result = scheduleService.replaceRecurringSchedules(staffId, request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).effectiveFrom()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(result.get(0).effectiveTo()).isEqualTo(LocalDate.of(2026, 11, 9));
    }

    @Test
    void replaceSchedulesRejectsInvalidDateRangeBeforeDatabaseAccess() {
        RecurringScheduleReplaceRequest request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 10), List.of());

        assertThatThrownBy(() -> scheduleService.replaceRecurringSchedules(UUID.randomUUID(), request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Ngày kết thúc hiệu lực");
        verifyNoInteractions(staffMemberRepository, scheduleRepository, workShiftRepository);
    }

    @Test
    void replaceSchedulesRejectsInactiveShift() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        StaffMember staff = StaffMember.builder().id(staffId).isActive(true).build();
        var request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 20),
                List.of(new RecurringScheduleDayRequest(DayOfWeek.MONDAY, List.of(shiftId))));
        given(staffMemberRepository.findByIdForUpdate(staffId)).willReturn(Optional.of(staff));
        given(workShiftRepository.findAllById(List.of(shiftId)))
                .willReturn(List.of(WorkShift.builder().id(shiftId).isActive(false).build()));

        assertThatThrownBy(() -> scheduleService.replaceRecurringSchedules(staffId, request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("ca làm việc không hoạt động");
        org.mockito.Mockito.verify(scheduleRepository, org.mockito.Mockito.never())
                .deleteAll(any());
    }

    @Test
    void replaceSchedulesRejectsDuplicateShiftInSameDay() {
        UUID shiftId = UUID.randomUUID();
        var request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 20),
                List.of(new RecurringScheduleDayRequest(DayOfWeek.MONDAY, List.of(shiftId, shiftId))));

        assertThatThrownBy(() -> scheduleService.replaceRecurringSchedules(UUID.randomUUID(), request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("không được trùng");
        verifyNoInteractions(staffMemberRepository, scheduleRepository, workShiftRepository);
    }

    @Test
    void replaceSchedulesRejectsOverlapsThatWouldRemainOutsideRequestedRange() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        StaffRecurringSchedule first = schedule(staffId, shiftId, 1,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 15));
        StaffRecurringSchedule second = schedule(staffId, shiftId, 1,
                LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 30));
        given(staffMemberRepository.findByIdForUpdate(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).isActive(true).build()));
        given(scheduleRepository.findByStaffIdOrderByDayOfWeekAscShiftIdAscEffectiveFromAsc(staffId))
                .willReturn(List.of(first, second));
        var request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 20), List.of());

        assertThatThrownBy(() -> scheduleService.replaceRecurringSchedules(staffId, request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("không được chồng lấn");
        org.mockito.Mockito.verify(scheduleRepository, org.mockito.Mockito.never()).deleteAll(any());
        verifyNoInteractions(workShiftRepository);
    }

    @Test
    void replaceSchedulesSupportsMultipleShiftsAcrossMultipleDays() {
        UUID staffId = UUID.randomUUID();
        UUID morningShiftId = UUID.randomUUID();
        UUID afternoonShiftId = UUID.randomUUID();
        given(staffMemberRepository.findByIdForUpdate(staffId))
                .willReturn(Optional.of(StaffMember.builder().id(staffId).isActive(true).build()));
        given(workShiftRepository.findAllById(List.of(morningShiftId, afternoonShiftId)))
                .willReturn(List.of(
                        WorkShift.builder().id(morningShiftId).isActive(true).build(),
                        WorkShift.builder().id(afternoonShiftId).isActive(true).build()));
        stubSchedulePersistence(staffId, List.of());
        var request = new RecurringScheduleReplaceRequest(
                LocalDate.of(2026, 11, 1), null,
                List.of(
                        new RecurringScheduleDayRequest(
                                DayOfWeek.MONDAY, List.of(morningShiftId, afternoonShiftId)),
                        new RecurringScheduleDayRequest(DayOfWeek.TUESDAY, List.of(morningShiftId))));

        var result = scheduleService.replaceRecurringSchedules(staffId, request);

        assertThat(result).hasSize(3);
        assertThat(result).extracting("dayOfWeek")
                .containsExactlyInAnyOrder(DayOfWeek.MONDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY);
        assertThat(result).extracting("shiftId")
                .containsExactlyInAnyOrder(morningShiftId, afternoonShiftId, morningShiftId);
    }

    private StaffRecurringSchedule schedule(
            UUID staffId,
            UUID shiftId,
            int dayOfWeek,
            LocalDate effectiveFrom,
            LocalDate effectiveTo
    ) {
        return StaffRecurringSchedule.builder()
                .id(UUID.randomUUID())
                .staffId(staffId)
                .shiftId(shiftId)
                .dayOfWeek(dayOfWeek)
                .effectiveFrom(effectiveFrom)
                .effectiveTo(effectiveTo)
                .build();
    }

    private void stubSchedulePersistence(UUID staffId, List<StaffRecurringSchedule> initialSchedules) {
        AtomicReference<List<StaffRecurringSchedule>> persistedSchedules =
                new AtomicReference<>(initialSchedules);
        given(scheduleRepository.saveAll(any())).willAnswer(invocation -> {
            List<StaffRecurringSchedule> schedules = invocation.getArgument(0);
            persistedSchedules.set(schedules);
            return schedules;
        });
        given(scheduleRepository.findByStaffIdOrderByDayOfWeekAscShiftIdAscEffectiveFromAsc(staffId))
                .willAnswer(invocation -> persistedSchedules.get());
    }
}
