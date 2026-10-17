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
 * Test {@code @PreAuthorize} thực tế bằng Spring proxy cho API lịch sử bảo dưỡng
 * theo khách hàng dành cho nhân viên, không cần DB hay JWT secret.
 *
 * <p>Endpoint này là đường rò dữ liệu khách hàng nguy hiểm nhất trong service:
 * {@code customerId} do client chỉ định nên chỉ một dấu nhấm là đọc được lịch
 * sử của người khác. Vì vậy test khoá đúng hai điều kiện phân quyền, và đặc
 * biệt khoá luôn trường hợp quyền đọc lịch sử bị cấp nhầm cho CUSTOMER trong
 * tương lai (V6 từng làm đúng điều đó một lần).
 */
@SpringJUnitConfig(CustomerServiceHistoryByIdControllerSecurityTest.TestConfig.class)
class CustomerServiceHistoryByIdControllerSecurityTest {

    @Autowired
    private CustomerServiceHistoryByIdController controller;
    @Autowired
    private ServiceHistoryService service;
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        reset(service);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /**
     * Ba role nhân viên đang được cấp {@code SERVICE_HISTORY_READ} (V5 của
     * user-service) đều đọc được lịch sử của hồ sơ bất kỳ.
     */
    @ParameterizedTest
    @ValueSource(strings = {"ROLE_ADMIN", "ROLE_MANAGER", "ROLE_MECHANIC"})
    void permitsStaffHoldingServiceHistoryRead(String roleAuthority) {
        authenticate("SERVICE_HISTORY_READ", roleAuthority);

        controller.getCustomerServiceHistory(CUSTOMER_ID, 0, 20);

        verify(service).getServiceHistoryByCustomer(CUSTOMER_ID,
                PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate")));
    }

    /**
     * CUSTOMER không có {@code SERVICE_HISTORY_READ} (V7 đã thu hồi), và dù có
     * thì cũng bị mệnh đề {@code not hasAuthority('ROLE_CUSTOMER')} chặn. Test
     * dùng token mang CẢ HAI authority để chứng minh mệnh đề thứ hai đang thực
     * sự làm việc chứ không phải chỉ là trang trí cho trường hợp không xảy ra.
     */
    @Test
    void deniesCustomerEvenIfHistoryReadWereGrantedByMistake() {
        authenticate("SERVICE_HISTORY_READ", "ROLE_CUSTOMER");

        assertThatThrownBy(() -> controller.getCustomerServiceHistory(CUSTOMER_ID, 0, 20))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }

    /** Khách hàng thuần tuý: bị chặn bởi cả hai mệnh đề, không đọc được gì. */
    @Test
    void deniesCustomerAuthority() {
        authenticate("SERVICE_HISTORY_READ_SELF");

        assertThatThrownBy(() -> controller.getCustomerServiceHistory(CUSTOMER_ID, 0, 20))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }

    /**
     * Đọc được hồ sơ người khác không cần quyền đọc DANH SÁCH khách hàng: đây là
     * lịch sử, không phải hồ sơ. Không vòng qua {@code CUSTOMER_READ} một cách
     * không cần thiết — nếu sau này thu hồi {@code CUSTOMER_READ} của nhân viên
     * thì endpoint này vẫn phải dùng được.
     */
    @Test
    void permitsHistoryReadWithoutCustomerRead() {
        authenticate("SERVICE_HISTORY_READ");

        controller.getCustomerServiceHistory(CUSTOMER_ID, 1, 5);

        verify(service).getServiceHistoryByCustomer(CUSTOMER_ID,
                PageRequest.of(1, 5, Sort.by(Sort.Direction.DESC, "serviceDate")));
    }

    /** Chưa đăng nhập thì bị chặn ở cổng method security, service không được gọi. */
    @Test
    void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> controller.getCustomerServiceHistory(CUSTOMER_ID, 0, 20))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
        verifyNoInteractions(service);
    }

    private void authenticate(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("tester", null,
                        List.of(authorities).stream()
                                .map(SimpleGrantedAuthority::new)
                                .toList()));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean
        ServiceHistoryService serviceHistoryService() {
            return mock(ServiceHistoryService.class);
        }

        @Bean
        CustomerServiceHistoryByIdController customerServiceHistoryByIdController(
                ServiceHistoryService serviceHistoryService) {
            return new CustomerServiceHistoryByIdController(serviceHistoryService);
        }
    }
}
