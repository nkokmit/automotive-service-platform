package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.service.ServiceHistoryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

/**
 * Test các @PreAuthorize thực tế bằng Spring proxy, không cần DB hoặc JWT secret.
 *
 * <p>Quyền của lịch sử cố ý tách khỏi quyền hồ sơ xe: đọc lịch sử bảo dưỡng và
 * nhập lịch sử từ gara ngoài là nghiệp vụ riêng, không suy ra từ {@code VEHICLE_*}.
 */
@SpringJUnitConfig(VehicleServiceHistoryControllerSecurityTest.TestConfig.class)
class VehicleServiceHistoryControllerSecurityTest {

    @Autowired
    private VehicleServiceHistoryController controller;
    @Autowired
    private ServiceHistoryService service;
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
    @ValueSource(strings = {"list", "create"})
    void permitsMatchingServiceHistoryAuthority(String operation) {
        authenticate(operation.equals("list") ? "SERVICE_HISTORY_READ" : "SERVICE_HISTORY_CREATE");

        invoke(operation);

        if (operation.equals("list")) {
            verify(service).getServiceHistory(ID,
                    PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate")));
        } else {
            verify(service).createServiceHistory(ID, null);
        }
    }

    /**
     * Quyền hồ sơ xe không đủ để đọc/ghi lịch sử: hai nghiệp vụ tách quyền, nên
     * token mang {@code VEHICLE_READ} vẫn bị chặn.
     */
    @ParameterizedTest
    @ValueSource(strings = {"list", "create"})
    void deniesVehicleAuthorityForServiceHistoryEndpoints(String operation) {
        authenticate("VEHICLE_READ");

        assertThatThrownBy(() -> invoke(operation)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }

    /**
     * {@code SERVICE_HISTORY_READ} không được tạo bản ghi: quyền ghi tách riêng vì
     * nhập lịch sử là thao tác làm thay đổi dữ liệu audit, không chỉ là đọc.
     */
    @Test
    void deniesReadAuthorityForCreateOperation() {
        authenticate("SERVICE_HISTORY_READ");

        assertThatThrownBy(() -> controller.createServiceHistory(ID, null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }

    @Test
    void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> controller.getServiceHistory(ID, 0, 20, "serviceDate", "DESC"))
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
            case "list" -> controller.getServiceHistory(ID, 0, 20, "serviceDate", "DESC");
            case "create" -> controller.createServiceHistory(ID, null);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        ServiceHistoryService serviceHistoryService() {
            return mock(ServiceHistoryService.class);
        }

        @Bean
        VehicleServiceHistoryController vehicleServiceHistoryController(
                ServiceHistoryService service) {
            return new VehicleServiceHistoryController(service);
        }
    }
}