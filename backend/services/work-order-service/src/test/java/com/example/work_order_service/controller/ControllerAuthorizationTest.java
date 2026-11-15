package com.example.work_order_service.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ControllerAuthorizationTest {

    private static final Set<String> WORK_ORDER_PERMISSIONS = Set.of(
            "WORK_ORDER_READ",
            "WORK_ORDER_CREATE",
            "WORK_ORDER_DIAGNOSIS_START",
            "WORK_ORDER_COMPLETE",
            "WORK_ORDER_CANCEL",
            "ESTIMATE_READ",
            "ESTIMATE_CREATE",
            "ESTIMATE_UPDATE",
            "ESTIMATE_SUBMIT",
            "ESTIMATE_DECISION_RECORD",
            "SERVICE_LINE_ASSIGN",
            "SERVICE_LINE_READ_ASSIGNED",
            "SERVICE_LINE_START",
            "SERVICE_LINE_COMPLETE",
            "PART_ISSUE",
            "PART_RELEASE");

    private static final Set<Class<?>> API_CONTROLLERS = Set.of(
            WorkOrderController.class,
            EstimateController.class,
            WorkOrderPartController.class,
            WorkOrderServiceLineController.class);

    @Test
    void everyApiEndpointRequiresADeclaredPermission() {
        Set<String> actualPermissions = API_CONTROLLERS.stream()
                .flatMap(controller -> Arrays.stream(controller.getDeclaredMethods()))
                .filter(ControllerAuthorizationTest::isApiEndpoint)
                .map(this::requiredPermission)
                .collect(java.util.stream.Collectors.toSet());

        assertThat(actualPermissions).containsExactlyInAnyOrderElementsOf(WORK_ORDER_PERMISSIONS);
    }

    private String requiredPermission(Method method) {
        PreAuthorize authorization = method.getAnnotation(PreAuthorize.class);
        assertThat(authorization)
                .as("%s.%s must have method-level permission authorization",
                        method.getDeclaringClass().getSimpleName(), method.getName())
                .isNotNull();
        assertThat(authorization.value()).matches("hasAuthority\\('[A-Z_]+'\\)");
        return authorization.value().substring("hasAuthority('".length(), authorization.value().length() - 2);
    }

    private static boolean isApiEndpoint(Method method) {
        return method.isAnnotationPresent(GetMapping.class)
                || method.isAnnotationPresent(PostMapping.class)
                || method.isAnnotationPresent(PutMapping.class)
                || method.isAnnotationPresent(PatchMapping.class)
                || method.isAnnotationPresent(DeleteMapping.class)
                || method.isAnnotationPresent(RequestMapping.class);
    }
}
