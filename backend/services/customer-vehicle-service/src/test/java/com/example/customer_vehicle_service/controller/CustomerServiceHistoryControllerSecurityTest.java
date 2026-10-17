package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.service.CurrentCustomerService;
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

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Test {@code @PreAuthorize("isAuthenticated()")} thực tế bằng Spring proxy, không
 * cần DB hay JWT secret.
 *
 * <p>Endpoint này dùng {@code isAuthenticated()} chứ không phải
 * {@code hasAuthority('SERVICE_HISTORY_READ')} — quyền đọc lịch sử của chính mình
 * không cần được cấp riêng, và nhờ vậy việc thu hồi quyền đọc lịch sử của MỌI xe
 * ở CUSTOMER không vô tình chặn luôn khả năng xem dữ liệu của chính mình.
 */
@SpringJUnitConfig(CustomerServiceHistoryControllerSecurityTest.TestConfig.class)
class CustomerServiceHistoryControllerSecurityTest {

    @Autowired
    private CustomerServiceHistoryController controller;
    @Autowired
    private ServiceHistoryService service;
    @Autowired
    private CurrentCustomerService currentCustomerService;
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        reset(service, currentCustomerService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /**
     * Bất kỳ ai đã đăng nhập cũng xem được lịch sử của chính mình, kể cả CUSTOMER
     * không còn quyền {@code SERVICE_HISTORY_READ}.
     */
    @ParameterizedTest
    @ValueSource(strings = {"CUSTOMER_READ", "SERVICE_HISTORY_READ", "VEHICLE_READ"})
    void permitsAnyAuthenticatedAuthority(String authority) {
        authenticate(authority);
        given(currentCustomerService.getRequiredCustomerId()).willReturn(CUSTOMER_ID);

        controller.getMyServiceHistory(0, 20);

        verify(service).getServiceHistoryByCustomer(CUSTOMER_ID,
                PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate")));
    }

    /**
     * CUSTOMER đã bị thu hồi quyền đọc lịch sử của mọi xe nhưng vẫn giữ được
     * endpoint này — đây là hành vi cố ý, test khoá lại để không ai vô tình đổi
     * annotation thành {@code hasAuthority} và chặn oan.
     */
    @Test
    void customerWithoutServiceHistoryReadStillSeesOwnHistory() {
        authenticate("CUSTOMER_READ");
        given(currentCustomerService.getRequiredCustomerId()).willReturn(CUSTOMER_ID);

        controller.getMyServiceHistory(0, 20);

        verify(service).getServiceHistoryByCustomer(CUSTOMER_ID,
                PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate")));
    }

    /** Chưa đăng nhập thì bị chặn ở cổng method security, service không được gọi. */
    @Test
    void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> controller.getMyServiceHistory(0, 20))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
        verifyNoInteractions(service, currentCustomerService);
    }

    /**
     * Đã đăng nhập nhưng không xác định được hồ sơ khách hàng (thiếu claim
     * {@code userId}, hồ sơ đã xoá mềm...) thì fail closed, không đọc được lịch
     * sử của ai cả — kể cả của chính mình.
     */
    @Test
    void authenticatedButUnresolvedProfileNeverReadsAnyHistory() {
        authenticate("CUSTOMER_READ");
        given(currentCustomerService.getRequiredCustomerId())
                .willThrow(new org.springframework.security.access.AccessDeniedException(
                        "Không xác định được hồ sơ khách hàng"));

        assertThatThrownBy(() -> controller.getMyServiceHistory(0, 20))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }

    private void authenticate(String authority) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("tester", null,
                        List.of(new SimpleGrantedAuthority(authority))));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        ServiceHistoryService serviceHistoryService() {
            return mock(ServiceHistoryService.class);
        }

        @Bean
        CurrentCustomerService currentCustomerService() {
            return mock(CurrentCustomerService.class);
        }

        @Bean
        CustomerServiceHistoryController customerServiceHistoryController(
                ServiceHistoryService serviceHistoryService,
                CurrentCustomerService currentCustomerService) {
            return new CustomerServiceHistoryController(serviceHistoryService, currentCustomerService);
        }
    }
}
