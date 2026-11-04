package com.example.staff_service.service;

import com.example.staff_service.dto.request.RecurringScheduleDayRequest;
import com.example.staff_service.dto.request.RecurringScheduleReplaceRequest;
import com.example.staff_service.dto.response.StaffRecurringScheduleResponse;
import com.example.staff_service.entity.StaffMember;
import com.example.staff_service.entity.StaffRecurringSchedule;
import com.example.staff_service.entity.WorkShift;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.StaffNotFoundException;
import com.example.staff_service.exception.WorkShiftNotFoundException;
import com.example.staff_service.repository.StaffMemberRepository;
import com.example.staff_service.repository.StaffRecurringScheduleRepository;
import com.example.staff_service.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StaffRecurringScheduleServiceImpl implements StaffRecurringScheduleService {

    private final StaffMemberRepository staffMemberRepository;
    private final StaffRecurringScheduleRepository scheduleRepository;
    private final WorkShiftRepository workShiftRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StaffRecurringScheduleResponse> getRecurringSchedules(UUID staffId) {
        requireStaff(staffId);
        return scheduleRepository.findByStaffIdOrderByDayOfWeekAscShiftIdAscEffectiveFromAsc(staffId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<StaffRecurringScheduleResponse> replaceRecurringSchedules(
            UUID staffId,
            RecurringScheduleReplaceRequest request
    ) {
        validateRequest(request);
        StaffMember staff = staffMemberRepository.findByIdForUpdate(staffId)
                .orElseThrow(() -> new StaffNotFoundException(
                        "Không tìm thấy nhân viên với id: " + staffId));
        if (!Boolean.TRUE.equals(staff.getIsActive())) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Không thể thiết lập lịch cho nhân viên không hoạt động");
        }

        List<StaffRecurringSchedule> currentSchedules =
                scheduleRepository.findByStaffIdOrderByDayOfWeekAscShiftIdAscEffectiveFromAsc(staffId);
        List<StaffRecurringSchedule> affectedSchedules = currentSchedules.stream()
                .filter(schedule -> overlaps(
                        schedule.getEffectiveFrom(), schedule.getEffectiveTo(),
                        request.effectiveFrom(), request.effectiveTo()))
                .toList();
        List<UUID> shiftIds = request.weeklySchedules().stream()
                .flatMap(day -> day.shiftIds().stream())
                .distinct()
                .toList();
        validateActiveShifts(shiftIds);

        List<StaffRecurringSchedule> retainedSchedules = splitOutsideRange(
                affectedSchedules, request.effectiveFrom(), request.effectiveTo());
        Set<UUID> affectedIds = affectedSchedules.stream()
                .map(StaffRecurringSchedule::getId)
                .collect(Collectors.toSet());
        List<StaffRecurringSchedule> untouchedSchedules = currentSchedules.stream()
                .filter(schedule -> !affectedIds.contains(schedule.getId()))
                .toList();
        List<StaffRecurringSchedule> requestedSchedules = createRequestedSchedules(staffId, request);
        List<StaffRecurringSchedule> resultingSchedules = new ArrayList<>(untouchedSchedules);
        resultingSchedules.addAll(retainedSchedules);
        resultingSchedules.addAll(requestedSchedules);
        validateNoOverlaps(resultingSchedules);

        scheduleRepository.deleteAll(affectedSchedules);
        scheduleRepository.flush();

        List<StaffRecurringSchedule> schedulesToSave = new ArrayList<>(retainedSchedules);
        schedulesToSave.addAll(requestedSchedules);
        scheduleRepository.saveAll(schedulesToSave);
        List<StaffRecurringSchedule> saved =
                scheduleRepository.findByStaffIdOrderByDayOfWeekAscShiftIdAscEffectiveFromAsc(staffId);
        log.info("Đã thay lịch định kỳ nhân viên trong khoảng: staffId={}, from={}, to={}, count={}",
                staffId, request.effectiveFrom(), request.effectiveTo(), saved.size());
        return saved.stream().map(this::toResponse).toList();
    }

    private List<StaffRecurringSchedule> createRequestedSchedules(
            UUID staffId,
            RecurringScheduleReplaceRequest request
    ) {
        List<StaffRecurringSchedule> schedules = new ArrayList<>();
        for (RecurringScheduleDayRequest day : request.weeklySchedules()) {
            for (UUID shiftId : day.shiftIds()) {
                schedules.add(StaffRecurringSchedule.builder()
                        .staffId(staffId)
                        .shiftId(shiftId)
                        .dayOfWeek(day.dayOfWeek().getValue())
                        .effectiveFrom(request.effectiveFrom())
                        .effectiveTo(request.effectiveTo())
                        .build());
            }
        }
        return schedules;
    }

    private void validateRequest(RecurringScheduleReplaceRequest request) {
        if (request == null || request.effectiveFrom() == null || request.weeklySchedules() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Khoảng hiệu lực và danh sách lịch theo tuần là bắt buộc");
        }
        if (request.effectiveTo() != null && request.effectiveTo().isBefore(request.effectiveFrom())) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Ngày kết thúc hiệu lực phải bằng hoặc sau ngày bắt đầu");
        }

        Set<DayOfWeek> days = new HashSet<>();
        for (RecurringScheduleDayRequest day : request.weeklySchedules()) {
            if (day == null || day.dayOfWeek() == null || day.shiftIds() == null || day.shiftIds().isEmpty()) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Mỗi ngày phải có thứ hợp lệ và ít nhất một ca");
            }
            if (!days.add(day.dayOfWeek())) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Mỗi thứ trong tuần chỉ được khai báo một lần");
            }
            if (day.shiftIds().stream().anyMatch(java.util.Objects::isNull)) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "ID ca không được để trống");
            }
            if (new HashSet<>(day.shiftIds()).size() != day.shiftIds().size()) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Danh sách ca trong cùng một ngày không được trùng");
            }
        }
    }

    private void validateActiveShifts(List<UUID> shiftIds) {
        if (shiftIds.isEmpty()) {
            return;
        }
        List<WorkShift> shifts = workShiftRepository.findAllById(shiftIds);
        if (shifts.size() != shiftIds.size()) {
            Set<UUID> foundIds = shifts.stream().map(WorkShift::getId).collect(Collectors.toSet());
            List<UUID> missingIds = shiftIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new WorkShiftNotFoundException("Không tìm thấy ca làm việc với id: " + missingIds.get(0));
        }
        if (shifts.stream().anyMatch(shift -> !Boolean.TRUE.equals(shift.getIsActive()))) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Không thể thiết lập lịch với ca làm việc không hoạt động");
        }
    }

    private List<StaffRecurringSchedule> splitOutsideRange(
            List<StaffRecurringSchedule> schedules,
            LocalDate effectiveFrom,
            LocalDate effectiveTo
    ) {
        List<StaffRecurringSchedule> retained = new ArrayList<>();
        for (StaffRecurringSchedule schedule : schedules) {
            if (schedule.getEffectiveFrom().isBefore(effectiveFrom)) {
                retained.add(copyWithPeriod(schedule, schedule.getEffectiveFrom(), effectiveFrom.minusDays(1)));
            }
            if (effectiveTo != null
                    && (schedule.getEffectiveTo() == null || schedule.getEffectiveTo().isAfter(effectiveTo))) {
                retained.add(copyWithPeriod(schedule, effectiveTo.plusDays(1), schedule.getEffectiveTo()));
            }
        }
        return retained;
    }

    private void validateNoOverlaps(List<StaffRecurringSchedule> schedules) {
        Map<ScheduleKey, List<StaffRecurringSchedule>> byDayAndShift = schedules.stream()
                .collect(Collectors.groupingBy(schedule ->
                        new ScheduleKey(schedule.getDayOfWeek(), schedule.getShiftId())));
        for (List<StaffRecurringSchedule> sameShiftAndDay : byDayAndShift.values()) {
            sameShiftAndDay.sort(Comparator.comparing(StaffRecurringSchedule::getEffectiveFrom));
            for (int index = 1; index < sameShiftAndDay.size(); index++) {
                StaffRecurringSchedule previous = sameShiftAndDay.get(index - 1);
                StaffRecurringSchedule current = sameShiftAndDay.get(index);
                if (previous.getEffectiveTo() == null
                        || !current.getEffectiveFrom().isAfter(previous.getEffectiveTo())) {
                    throw new ApiException(ErrorCode.INVALID_REQUEST,
                            "Khoảng hiệu lực của cùng ca và thứ trong tuần không được chồng lấn");
                }
            }
        }
    }

    private boolean overlaps(
            LocalDate existingFrom,
            LocalDate existingTo,
            LocalDate requestedFrom,
            LocalDate requestedTo
    ) {
        return (requestedTo == null || !existingFrom.isAfter(requestedTo))
                && (existingTo == null || !existingTo.isBefore(requestedFrom));
    }

    private StaffRecurringSchedule copyWithPeriod(
            StaffRecurringSchedule source,
            LocalDate effectiveFrom,
            LocalDate effectiveTo
    ) {
        return StaffRecurringSchedule.builder()
                .staffId(source.getStaffId())
                .shiftId(source.getShiftId())
                .dayOfWeek(source.getDayOfWeek())
                .effectiveFrom(effectiveFrom)
                .effectiveTo(effectiveTo)
                .build();
    }

    private StaffMember requireStaff(UUID staffId) {
        return staffMemberRepository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException(
                        "Không tìm thấy nhân viên với id: " + staffId));
    }

    private StaffRecurringScheduleResponse toResponse(StaffRecurringSchedule schedule) {
        return new StaffRecurringScheduleResponse(
                schedule.getId(),
                schedule.getShiftId(),
                DayOfWeek.of(schedule.getDayOfWeek()),
                schedule.getEffectiveFrom(),
                schedule.getEffectiveTo());
    }

    private record ScheduleKey(Integer dayOfWeek, UUID shiftId) {
    }
}
