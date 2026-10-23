package com.example.staff_service.service;

import com.example.staff_service.dto.response.ScheduleDayResponse;
import com.example.staff_service.dto.response.ScheduleIntervalResponse;
import com.example.staff_service.dto.response.StaffAvailabilityResponse;
import com.example.staff_service.dto.response.StaffScheduleResponse;
import com.example.staff_service.entity.ScheduleExceptionType;
import com.example.staff_service.entity.StaffAbsence;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.entity.StaffRecurringSchedule;
import com.example.staff_service.entity.StaffScheduleException;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.StaffNotFoundException;
import com.example.staff_service.repository.StaffAbsenceRepository;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.repository.StaffRecurringScheduleRepository;
import com.example.staff_service.repository.StaffScheduleExceptionRepository;
import com.example.staff_service.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StaffScheduleAggregationServiceImpl implements StaffScheduleAggregationService {

    private static final int MAX_SCHEDULE_RANGE_DAYS = 31;

    private final StaffMemberRepository staffMemberRepository;
    private final StaffRecurringScheduleRepository recurringScheduleRepository;
    private final StaffScheduleExceptionRepository scheduleExceptionRepository;
    private final StaffAbsenceRepository absenceRepository;
    private final WorkShiftRepository workShiftRepository;
    private final ZoneId scheduleZoneId;

    @Override
    public StaffScheduleResponse getStaffSchedule(UUID staffId, LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        StaffMember staff = staffMemberRepository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException("Không tìm thấy nhân viên với id: " + staffId));
        List<StaffMember> staffMembers = Boolean.TRUE.equals(staff.getIsActive())
                ? List.of(staff)
                : List.of();
        return aggregate(staffMembers, from, to, true).stream().findFirst()
                .orElseGet(() -> emptySchedule(staff, from, to));
    }

    @Override
    public List<StaffScheduleResponse> getGarageSchedule(LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        List<StaffMember> staffMembers = staffMemberRepository.findByIsActiveTrueOrderByEmployeeCodeAsc();
        if (staffMembers.isEmpty()) {
            return List.of();
        }
        return aggregate(staffMembers, from, to, false).stream()
                .filter(schedule -> schedule.days().stream().anyMatch(day -> !day.intervals().isEmpty()))
                .toList();
    }

    @Override
    public List<StaffAvailabilityResponse> findAvailableStaff(Instant startAt, Instant endAt) {
        if (startAt == null || endAt == null || !startAt.isBefore(endAt)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Thời điểm bắt đầu phải trước thời điểm kết thúc");
        }
        LocalDate from = startAt.atZone(scheduleZoneId).toLocalDate();
        LocalDate to = endAt.minusNanos(1).atZone(scheduleZoneId).toLocalDate();
        List<StaffMember> staffMembers = staffMemberRepository.findByIsActiveTrueOrderByEmployeeCodeAsc();
        if (staffMembers.isEmpty()) {
            return List.of();
        }

        Map<UUID, StaffScheduleResponse> schedules = aggregate(staffMembers, from, to, false).stream()
                .collect(Collectors.toMap(StaffScheduleResponse::staffId, Function.identity()));
        return staffMembers.stream()
                .filter(staff -> covers(
                        schedules.get(staff.getId()), startAt, endAt))
                .map(staff -> new StaffAvailabilityResponse(
                        staff.getId(), staff.getEmployeeCode(), staff.getFullName(), startAt, endAt))
                .toList();
    }

    private List<StaffScheduleResponse> aggregate(
            List<StaffMember> staffMembers,
            LocalDate from,
            LocalDate to,
            boolean includeEmptyDays
    ) {
        if (staffMembers.isEmpty()) {
            return List.of();
        }
        List<UUID> staffIds = staffMembers.stream().map(StaffMember::getId).toList();
        Instant fromInstant = from.atStartOfDay(scheduleZoneId).toInstant();
        Instant toExclusive = to.plusDays(1).atStartOfDay(scheduleZoneId).toInstant();

        List<StaffRecurringSchedule> recurringSchedules =
                recurringScheduleRepository.findEffectiveInRange(staffIds, from, to);
        List<StaffScheduleException> exceptions =
                scheduleExceptionRepository.findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
                        staffIds, from, to);
        List<StaffAbsence> absences =
                absenceRepository.findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
                        staffIds, toExclusive, fromInstant);

        Collection<UUID> shiftIds = new java.util.HashSet<>();
        recurringSchedules.forEach(schedule -> shiftIds.add(schedule.getShiftId()));
        exceptions.forEach(exception -> shiftIds.add(exception.getShiftId()));
        Map<UUID, WorkShift> shifts = shiftIds.isEmpty()
                ? Map.of()
                : workShiftRepository.findAllByIdIncludingDeleted(
                                shiftIds.stream().map(UUID::toString).toList())
                        .stream()
                        .collect(Collectors.toMap(WorkShift::getId, Function.identity()));

        Map<UUID, List<StaffRecurringSchedule>> recurringByStaff = recurringSchedules.stream()
                .collect(Collectors.groupingBy(StaffRecurringSchedule::getStaffId));
        Map<StaffDate, List<StaffScheduleException>> exceptionsByStaffDate = exceptions.stream()
                .collect(Collectors.groupingBy(exception ->
                        new StaffDate(exception.getStaffId(), exception.getExceptionDate())));
        Map<UUID, List<StaffAbsence>> absencesByStaff = absences.stream()
                .collect(Collectors.groupingBy(StaffAbsence::getStaffId));

        List<StaffScheduleResponse> responses = new ArrayList<>(staffMembers.size());
        for (StaffMember staff : staffMembers) {
            List<ScheduleDayResponse> days = new ArrayList<>();
            for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
                List<ScheduleIntervalResponse> intervals = getIntervals(
                        date,
                        recurringByStaff.getOrDefault(staff.getId(), List.of()),
                        exceptionsByStaffDate.getOrDefault(new StaffDate(staff.getId(), date), List.of()),
                        absencesByStaff.getOrDefault(staff.getId(), List.of()),
                        shifts);
                if (includeEmptyDays || !intervals.isEmpty()) {
                    days.add(new ScheduleDayResponse(date, intervals));
                }
            }
            responses.add(new StaffScheduleResponse(
                    staff.getId(), staff.getEmployeeCode(), staff.getFullName(), List.copyOf(days)));
        }
        return List.copyOf(responses);
    }

    private List<ScheduleIntervalResponse> getIntervals(
            LocalDate date,
            List<StaffRecurringSchedule> recurringSchedules,
            List<StaffScheduleException> exceptions,
            List<StaffAbsence> absences,
            Map<UUID, WorkShift> shifts
    ) {
        Map<UUID, WorkShift> scheduledShifts = new HashMap<>();
        int dayOfWeek = date.getDayOfWeek().getValue();
        recurringSchedules.stream()
                .filter(schedule -> schedule.getDayOfWeek() == dayOfWeek
                        && !schedule.getEffectiveFrom().isAfter(date)
                        && (schedule.getEffectiveTo() == null || !schedule.getEffectiveTo().isBefore(date)))
                .map(StaffRecurringSchedule::getShiftId)
                .map(shifts::get)
                .filter(java.util.Objects::nonNull)
                .forEach(shift -> scheduledShifts.put(shift.getId(), shift));

        for (StaffScheduleException exception : exceptions) {
            WorkShift shift = shifts.get(exception.getShiftId());
            if (shift == null) {
                continue;
            }
            if (exception.getExceptionType() == ScheduleExceptionType.CANCEL_SHIFT) {
                scheduledShifts.remove(exception.getShiftId());
            } else if (exception.getExceptionType() == ScheduleExceptionType.ADD_SHIFT) {
                scheduledShifts.put(exception.getShiftId(), shift);
            }
        }

        return scheduledShifts.values().stream()
                .flatMap(shift -> subtractAbsences(
                        shift, date, absences).stream())
                .sorted(Comparator.comparing(ScheduleIntervalResponse::startAt)
                        .thenComparing(ScheduleIntervalResponse::endAt)
                        .thenComparing(ScheduleIntervalResponse::shiftCode))
                .toList();
    }

    private List<ScheduleIntervalResponse> subtractAbsences(
            WorkShift shift,
            LocalDate date,
            List<StaffAbsence> absences
    ) {
        Instant shiftStart = date.atTime(shift.getStartTime()).atZone(scheduleZoneId).toInstant();
        Instant shiftEnd = date.atTime(shift.getEndTime()).atZone(scheduleZoneId).toInstant();
        List<StaffAbsence> overlaps = absences.stream()
                .filter(absence -> absence.getStartAt().isBefore(shiftEnd)
                        && absence.getEndAt().isAfter(shiftStart))
                .sorted(Comparator.comparing(StaffAbsence::getStartAt))
                .toList();
        List<ScheduleIntervalResponse> result = new ArrayList<>();
        Instant cursor = shiftStart;
        for (StaffAbsence absence : overlaps) {
            Instant absenceStart = absence.getStartAt().isBefore(shiftStart) ? shiftStart : absence.getStartAt();
            Instant absenceEnd = absence.getEndAt().isAfter(shiftEnd) ? shiftEnd : absence.getEndAt();
            if (absenceStart.isAfter(cursor)) {
                result.add(interval(shift, cursor, absenceStart));
            }
            if (absenceEnd.isAfter(cursor)) {
                cursor = absenceEnd;
            }
        }
        if (cursor.isBefore(shiftEnd)) {
            result.add(interval(shift, cursor, shiftEnd));
        }
        return result;
    }

    private ScheduleIntervalResponse interval(WorkShift shift, Instant startAt, Instant endAt) {
        return new ScheduleIntervalResponse(
                shift.getId(), shift.getCode(), shift.getName(), startAt, endAt);
    }

    private boolean covers(StaffScheduleResponse schedule, Instant startAt, Instant endAt) {
        if (schedule == null) {
            return false;
        }
        List<ScheduleIntervalResponse> intervals = schedule.days().stream()
                .flatMap(day -> day.intervals().stream())
                .sorted(Comparator.comparing(ScheduleIntervalResponse::startAt)
                        .thenComparing(ScheduleIntervalResponse::endAt))
                .toList();
        Instant coveredUntil = startAt;
        for (ScheduleIntervalResponse interval : intervals) {
            if (interval.endAt().isBefore(coveredUntil) || interval.endAt().equals(coveredUntil)) {
                continue;
            }
            if (interval.startAt().isAfter(coveredUntil)) {
                return false;
            }
            if (interval.endAt().isAfter(coveredUntil)) {
                coveredUntil = interval.endAt();
            }
            if (!coveredUntil.isBefore(endAt)) {
                return true;
            }
        }
        return false;
    }

    private StaffScheduleResponse emptySchedule(StaffMember staff, LocalDate from, LocalDate to) {
        List<ScheduleDayResponse> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            days.add(new ScheduleDayResponse(date, List.of()));
        }
        return new StaffScheduleResponse(
                staff.getId(), staff.getEmployeeCode(), staff.getFullName(), List.copyOf(days));
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Khoảng ngày phải có from bằng hoặc trước to");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_SCHEDULE_RANGE_DAYS) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Khoảng ngày tra cứu tối đa là 31 ngày");
        }
    }

    private record StaffDate(UUID staffId, LocalDate date) {
    }
}
