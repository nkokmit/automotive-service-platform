package com.example.staff_service.service;

import com.example.staff_service.dto.response.StaffScheduleResponse;
import com.example.staff_service.entity.ScheduleExceptionType;
import com.example.staff_service.entity.StaffAbsence;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.entity.StaffRecurringSchedule;
import com.example.staff_service.entity.StaffScheduleException;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.repository.StaffAbsenceRepository;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.repository.StaffRecurringScheduleRepository;
import com.example.staff_service.repository.StaffScheduleExceptionRepository;
import com.example.staff_service.repository.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StaffScheduleAggregationServiceImplTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private StaffMemberRepository staffMemberRepository;

    @Mock
    private StaffRecurringScheduleRepository recurringScheduleRepository;

    @Mock
    private StaffScheduleExceptionRepository scheduleExceptionRepository;

    @Mock
    private StaffAbsenceRepository absenceRepository;

    @Mock
    private WorkShiftRepository workShiftRepository;

    private StaffScheduleAggregationServiceImpl scheduleService;

    @BeforeEach
    void setUp() {
        scheduleService = new StaffScheduleAggregationServiceImpl(
                staffMemberRepository,
                recurringScheduleRepository,
                scheduleExceptionRepository,
                absenceRepository,
                workShiftRepository,
                ZONE);
    }

    @Test
    void subtractsOverlappingAbsencesAndKeepsPreviouslyScheduledInactiveShift() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 2);
        StaffMember staff = staff(staffId, true);
        WorkShift inactiveShift = shift(shiftId, "DAY", LocalTime.of(9, 0), LocalTime.of(17, 0), false);
        StaffAbsence firstAbsence = absence(staffId,
                date.atTime(11, 0).atZone(ZONE).toInstant(),
                date.atTime(12, 30).atZone(ZONE).toInstant());
        StaffAbsence secondAbsence = absence(staffId,
                date.atTime(12, 0).atZone(ZONE).toInstant(),
                date.atTime(13, 0).atZone(ZONE).toInstant());
        given(staffMemberRepository.findById(staffId)).willReturn(Optional.of(staff));
        given(recurringScheduleRepository.findEffectiveInRange(List.of(staffId), date, date))
                .willReturn(List.of(recurring(staffId, shiftId, date)));
        given(scheduleExceptionRepository
                .findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
                        List.of(staffId), date, date))
                .willReturn(List.of());
        given(absenceRepository.findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                eq(List.of(staffId)), any(Instant.class), any(Instant.class)))
                .willReturn(List.of(firstAbsence, secondAbsence));
        given(workShiftRepository.findAllByIdIncludingDeleted(List.of(shiftId.toString())))
                .willReturn(List.of(inactiveShift));

        StaffScheduleResponse response = scheduleService.getStaffSchedule(staffId, date, date);

        assertThat(response.days()).hasSize(1);
        assertThat(response.days().get(0).intervals())
                .extracting(interval -> List.of(interval.startAt(), interval.endAt()))
                .containsExactly(
                        List.of(date.atTime(9, 0).atZone(ZONE).toInstant(),
                                date.atTime(11, 0).atZone(ZONE).toInstant()),
                        List.of(date.atTime(13, 0).atZone(ZONE).toInstant(),
                                date.atTime(17, 0).atZone(ZONE).toInstant()));
    }

    @Test
    void appliesCancelAndAddExceptionsAfterRecurringSchedule() {
        UUID staffId = UUID.randomUUID();
        UUID cancelledShiftId = UUID.randomUUID();
        UUID addedShiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 2);
        StaffMember staff = staff(staffId, true);
        WorkShift cancelledShift = shift(
                cancelledShiftId, "MORNING", LocalTime.of(8, 0), LocalTime.of(12, 0), false);
        WorkShift addedShift = shift(
                addedShiftId, "EXTRA", LocalTime.of(13, 0), LocalTime.of(15, 0), false);
        given(staffMemberRepository.findById(staffId)).willReturn(Optional.of(staff));
        given(recurringScheduleRepository.findEffectiveInRange(List.of(staffId), date, date))
                .willReturn(List.of(recurring(staffId, cancelledShiftId, date)));
        given(scheduleExceptionRepository
                .findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
                        List.of(staffId), date, date))
                .willReturn(List.of(
                        exception(staffId, cancelledShiftId, date, ScheduleExceptionType.CANCEL_SHIFT),
                        exception(staffId, addedShiftId, date, ScheduleExceptionType.ADD_SHIFT)));
        given(absenceRepository.findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                eq(List.of(staffId)), any(Instant.class), any(Instant.class)))
                .willReturn(List.of());
        given(workShiftRepository.findAllByIdIncludingDeleted(anyCollection()))
                .willReturn(List.of(cancelledShift, addedShift));

        StaffScheduleResponse response = scheduleService.getStaffSchedule(staffId, date, date);

        assertThat(response.days().get(0).intervals())
                .singleElement()
                .satisfies(interval -> {
                    assertThat(interval.shiftId()).isEqualTo(addedShiftId);
                    assertThat(interval.startAt()).isEqualTo(date.atTime(13, 0).atZone(ZONE).toInstant());
                    assertThat(interval.endAt()).isEqualTo(date.atTime(15, 0).atZone(ZONE).toInstant());
                });
    }

    @Test
    void adjacentShiftsTogetherCanCoverAnAvailabilityRequest() {
        UUID staffId = UUID.randomUUID();
        UUID firstShiftId = UUID.randomUUID();
        UUID secondShiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 2);
        StaffMember staff = staff(staffId, true);
        given(staffMemberRepository.findByIsActiveTrueOrderByEmployeeCodeAsc())
                .willReturn(List.of(staff));
        given(recurringScheduleRepository.findEffectiveInRange(List.of(staffId), date, date))
                .willReturn(List.of(
                        recurring(staffId, firstShiftId, date),
                        recurring(staffId, secondShiftId, date)));
        given(scheduleExceptionRepository
                .findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
                        List.of(staffId), date, date))
                .willReturn(List.of());
        given(absenceRepository.findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                eq(List.of(staffId)), any(Instant.class), any(Instant.class)))
                .willReturn(List.of());
        given(workShiftRepository.findAllByIdIncludingDeleted(anyCollection()))
                .willReturn(List.of(
                        shift(firstShiftId, "FIRST", LocalTime.of(9, 0), LocalTime.of(12, 0), true),
                        shift(secondShiftId, "SECOND", LocalTime.of(12, 0), LocalTime.of(14, 0), true)));

        var result = scheduleService.findAvailableStaff(
                date.atTime(10, 0).atZone(ZONE).toInstant(),
                date.atTime(13, 0).atZone(ZONE).toInstant());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).staffId()).isEqualTo(staffId);
    }

    @Test
    void scheduleIncludesEveryDateAcrossWeekBoundaries() {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2026, 11, 2);
        LocalDate to = LocalDate.of(2026, 11, 9);
        StaffMember staff = staff(staffId, true);
        WorkShift shift = shift(shiftId, "MONDAY", LocalTime.of(9, 0), LocalTime.of(17, 0), true);
        given(staffMemberRepository.findById(staffId)).willReturn(Optional.of(staff));
        given(recurringScheduleRepository.findEffectiveInRange(List.of(staffId), from, to))
                .willReturn(List.of(StaffRecurringSchedule.builder()
                        .staffId(staffId)
                        .shiftId(shiftId)
                        .dayOfWeek(from.getDayOfWeek().getValue())
                        .effectiveFrom(from)
                        .effectiveTo(to)
                        .build()));
        given(scheduleExceptionRepository
                .findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
                        List.of(staffId), from, to))
                .willReturn(List.of());
        given(absenceRepository.findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                eq(List.of(staffId)), any(Instant.class), any(Instant.class)))
                .willReturn(List.of());
        given(workShiftRepository.findAllByIdIncludingDeleted(List.of(shiftId.toString())))
                .willReturn(List.of(shift));

        StaffScheduleResponse response = scheduleService.getStaffSchedule(staffId, from, to);

        assertThat(response.days()).hasSize(8);
        assertThat(response.days())
                .filteredOn(day -> !day.intervals().isEmpty())
                .extracting(day -> day.date())
                .containsExactly(from, to);
    }

    @Test
    void aGapBetweenShiftsDoesNotSatisfyFullAvailabilityCoverage() {
        UUID staffId = UUID.randomUUID();
        UUID firstShiftId = UUID.randomUUID();
        UUID secondShiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 2);
        StaffMember staff = staff(staffId, true);
        given(staffMemberRepository.findByIsActiveTrueOrderByEmployeeCodeAsc())
                .willReturn(List.of(staff));
        given(recurringScheduleRepository.findEffectiveInRange(List.of(staffId), date, date))
                .willReturn(List.of(
                        recurring(staffId, firstShiftId, date),
                        recurring(staffId, secondShiftId, date)));
        given(scheduleExceptionRepository
                .findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
                        List.of(staffId), date, date))
                .willReturn(List.of());
        given(absenceRepository.findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                eq(List.of(staffId)), any(Instant.class), any(Instant.class)))
                .willReturn(List.of());
        given(workShiftRepository.findAllByIdIncludingDeleted(anyCollection()))
                .willReturn(List.of(
                        shift(firstShiftId, "FIRST", LocalTime.of(9, 0), LocalTime.of(11, 0), true),
                        shift(secondShiftId, "SECOND", LocalTime.of(12, 0), LocalTime.of(14, 0), true)));

        var result = scheduleService.findAvailableStaff(
                date.atTime(10, 0).atZone(ZONE).toInstant(),
                date.atTime(13, 0).atZone(ZONE).toInstant());

        assertThat(result).isEmpty();
    }

    @Test
    void inactiveStaffReturnsDaysWithoutWorkIntervals() {
        UUID staffId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2026, 11, 2);
        LocalDate to = from.plusDays(2);
        given(staffMemberRepository.findById(staffId)).willReturn(Optional.of(staff(staffId, false)));

        StaffScheduleResponse response = scheduleService.getStaffSchedule(staffId, from, to);

        assertThat(response.days()).hasSize(3)
                .allSatisfy(day -> assertThat(day.intervals()).isEmpty());
        verifyNoInteractions(recurringScheduleRepository, scheduleExceptionRepository,
                absenceRepository, workShiftRepository);
    }

    @Test
    void rejectsScheduleRangeLongerThanThirtyOneDays() {
        LocalDate from = LocalDate.of(2026, 11, 1);

        assertThatThrownBy(() -> scheduleService.getGarageSchedule(from, from.plusDays(31)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("31 ngày");
    }

    private StaffMember staff(UUID id, boolean active) {
        return StaffMember.builder()
                .id(id)
                .employeeCode("ST-" + id.toString().substring(0, 8))
                .fullName("Technician")
                .isActive(active)
                .build();
    }

    private WorkShift shift(UUID id, String code, LocalTime start, LocalTime end, boolean active) {
        return WorkShift.builder()
                .id(id)
                .code(code)
                .name(code)
                .startTime(start)
                .endTime(end)
                .isActive(active)
                .build();
    }

    private StaffRecurringSchedule recurring(UUID staffId, UUID shiftId, LocalDate date) {
        return StaffRecurringSchedule.builder()
                .staffId(staffId)
                .shiftId(shiftId)
                .dayOfWeek(date.getDayOfWeek().getValue())
                .effectiveFrom(date)
                .effectiveTo(date)
                .build();
    }

    private StaffScheduleException exception(
            UUID staffId,
            UUID shiftId,
            LocalDate date,
            ScheduleExceptionType type
    ) {
        return StaffScheduleException.builder()
                .staffId(staffId)
                .shiftId(shiftId)
                .exceptionDate(date)
                .exceptionType(type)
                .build();
    }

    private StaffAbsence absence(UUID staffId, Instant startAt, Instant endAt) {
        return StaffAbsence.builder().staffId(staffId).startAt(startAt).endAt(endAt).build();
    }
}
