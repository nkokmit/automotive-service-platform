package com.example.staff_service.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class StaffAuthorizationTest {

    @Test
    void everyStaffApiRequiresItsSpecificPermission() {
        assertAuthorityRules(StaffController.class, Map.of(
                "getStaff", "STAFF_READ",
                "getStaffById", "STAFF_READ",
                "createStaff", "STAFF_CREATE",
                "updateStaff", "STAFF_UPDATE",
                "updateStaffIsActive", "STAFF_UPDATE",
                "deleteStaff", "STAFF_DELETE"));

        assertAuthorityRules(WorkShiftController.class, Map.of(
                "getWorkShifts", "WORK_SHIFT_READ",
                "getWorkShiftById", "WORK_SHIFT_READ",
                "createWorkShift", "WORK_SHIFT_CREATE",
                "updateWorkShift", "WORK_SHIFT_UPDATE",
                "updateWorkShiftIsActive", "WORK_SHIFT_UPDATE",
                "deleteWorkShift", "WORK_SHIFT_DELETE"));

        assertAuthorityRules(StaffRecurringScheduleController.class, Map.of(
                "getRecurringSchedules", "STAFF_SCHEDULE_READ",
                "replaceRecurringSchedules", "STAFF_SCHEDULE_UPDATE"));

        assertAuthorityRules(StaffAbsenceController.class, Map.of(
                "getAbsences", "STAFF_ABSENCE_READ",
                "createAbsence", "STAFF_ABSENCE_CREATE",
                "updateAbsence", "STAFF_ABSENCE_UPDATE",
                "deleteAbsence", "STAFF_ABSENCE_DELETE"));

        assertAuthorityRules(StaffScheduleExceptionController.class, Map.of(
                "getExceptions", "STAFF_SCHEDULE_EXCEPTION_READ",
                "createException", "STAFF_SCHEDULE_EXCEPTION_CREATE",
                "updateException", "STAFF_SCHEDULE_EXCEPTION_UPDATE",
                "deleteException", "STAFF_SCHEDULE_EXCEPTION_DELETE"));

        assertAuthorityRules(StaffScheduleAggregationController.class, Map.of(
                "getStaffSchedule", "STAFF_SCHEDULE_READ",
                "getGarageSchedule", "STAFF_SCHEDULE_READ",
                "findAvailableStaff", "STAFF_SCHEDULE_READ"));
    }

    private void assertAuthorityRules(Class<?> controller, Map<String, String> expectedPermissions) {
        Map<String, String> actualRules = Arrays.stream(controller.getDeclaredMethods())
                .filter(this::isRequestHandler)
                .collect(Collectors.toMap(
                        Method::getName,
                        method -> {
                            PreAuthorize authorization = method.getAnnotation(PreAuthorize.class);
                            assertThat(authorization)
                                    .as("%s.%s must require an authority", controller.getSimpleName(), method.getName())
                                    .isNotNull();
                            return authorization.value();
                        }));

        assertThat(actualRules.keySet()).isEqualTo(expectedPermissions.keySet());
        assertThat(actualRules).containsExactlyInAnyOrderEntriesOf(
                expectedPermissions.entrySet().stream().collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> "hasAuthority('%s')".formatted(entry.getValue()))));
    }

    private boolean isRequestHandler(Method method) {
        return method.isAnnotationPresent(GetMapping.class)
                || method.isAnnotationPresent(PostMapping.class)
                || method.isAnnotationPresent(PutMapping.class)
                || method.isAnnotationPresent(PatchMapping.class)
                || method.isAnnotationPresent(DeleteMapping.class);
    }
}
