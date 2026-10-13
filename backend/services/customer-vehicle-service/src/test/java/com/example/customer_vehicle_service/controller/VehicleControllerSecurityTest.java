package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.service.VehicleService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** Test các @PreAuthorize thực tế bằng Spring proxy, không cần DB hoặc JWT secret. */
@SpringJUnitConfig(VehicleControllerSecurityTest.TestConfig.class)
class VehicleControllerSecurityTest {

    @Autowired
    private VehicleController controller;
    @Autowired
    private VehicleService service;
    private static final UUID ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        reset(service);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(strings = {"list", "detail", "create", "update", "delete"})
    void permitsMatchingVehicleAuthority(String operation) {
        authenticate(switch (operation) {
            case "list", "detail" -> "VEHICLE_READ";
            case "create" -> "VEHICLE_CREATE";
            case "update" -> "VEHICLE_UPDATE";
            case "delete" -> "VEHICLE_DELETE";
            default -> throw new IllegalArgumentException(operation);
        });

        invoke(operation);

        switch (operation) {
            case "list" -> verify(service).getVehicles(null, null, null, null,
                    org.springframework.data.domain.PageRequest.of(0, 20,
                            org.springframework.data.domain.Sort.by(
                                    org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
            case "detail" -> verify(service).getVehicleById(ID);
            case "create" -> verify(service).createVehicle(null);
            case "update" -> verify(service).updateVehicle(ID, null);
            case "delete" -> verify(service).deleteVehicle(ID);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"list", "detail", "create", "update", "delete"})
    void deniesCustomerAuthorityForVehicleEndpoints(String operation) {
        authenticate("CUSTOMER_READ");

        assertThatThrownBy(() -> invoke(operation)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }

    @Test
    void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> controller.getVehicleById(ID))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
        verifyNoInteractions(service);
    }

    private void authenticate(String authority) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("tester", null,
                        List.of(new SimpleGrantedAuthority(authority))));
    }

    private void invoke(String operation) {
        switch (operation) {
            case "list" -> controller.getVehicles(null, null, null, null, 0, 20, "createdAt", "DESC");
            case "detail" -> controller.getVehicleById(ID);
            case "create" -> controller.createVehicle(null);
            case "update" -> controller.updateVehicle(ID, null);
            case "delete" -> controller.deleteVehicle(ID);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        VehicleService vehicleService() {
            return mock(VehicleService.class);
        }

        @Bean
        VehicleController vehicleController(VehicleService service) {
            return new VehicleController(service);
        }
    }
}
