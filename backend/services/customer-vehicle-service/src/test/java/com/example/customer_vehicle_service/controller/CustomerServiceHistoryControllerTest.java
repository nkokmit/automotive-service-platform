package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.exception.CustomerProfileUnresolvedException;
import com.example.customer_vehicle_service.exception.GlobalExceptionHandler;
import com.example.customer_vehicle_service.service.CurrentCustomerService;
import com.example.customer_vehicle_service.service.ServiceHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test binding/response cho {@code GET /api/service-history/me}; quyền được test
 * riêng bằng method-security proxy trong
 * {@code CustomerServiceHistoryControllerSecurityTest}.
 *
 * <p>Trọng tâm của file này là bất biến quan trọng nhất của endpoint: danh tính
 * lấy từ token qua {@link CurrentCustomerService}, tuyệt đối không lấy từ
 * tham số request — nếu client tự truyền {@code customerId} thì đây là chỗ rò
 * dữ liệu khách hàng.
 */
@ExtendWith(MockitoExtension.class)
class CustomerServiceHistoryControllerTest {

    @Mock
    private ServiceHistoryService serviceHistoryService;
    @Mock
    private CurrentCustomerService currentCustomerService;
    private MockMvc mvc;
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID VEHICLE_ID = UUID.randomUUID();
    private static final Instant SERVICE_DATE = Instant.parse("2026-01-15T08:30:00Z");

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders
                .standaloneSetup(new CustomerServiceHistoryController(
                        serviceHistoryService, currentCustomerService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void listUsesDefaultPaginationAndApiEnvelope() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(currentCustomerService.getRequiredCustomerId()).willReturn(CUSTOMER_ID);
        given(serviceHistoryService.getServiceHistoryByCustomer(CUSTOMER_ID, pageable))
                .willReturn(new PageResponse<>(List.of(response()), 0, 20, 1, 1, false, false));

        mvc.perform(get("/api/service-history/me"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.size").value(20))
                .andExpect(jsonPath("$.result.totalElements").value(1))
                .andExpect(jsonPath("$.result.items[0].customerId").value(CUSTOMER_ID.toString()))
                .andExpect(jsonPath("$.result.items[0].vehicleId").value(VEHICLE_ID.toString()))
                .andExpect(jsonPath("$.result.items[0].recordType").value("EXTERNAL_SERVICE"));

        verify(serviceHistoryService).getServiceHistoryByCustomer(CUSTOMER_ID, pageable);
    }

    @Test
    void listBindsCustomPagination() throws Exception {
        var pageable = PageRequest.of(2, 5, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(currentCustomerService.getRequiredCustomerId()).willReturn(CUSTOMER_ID);
        given(serviceHistoryService.getServiceHistoryByCustomer(CUSTOMER_ID, pageable))
                .willReturn(new PageResponse<>(List.of(), 2, 5, 0, 0, false, false));

        mvc.perform(get("/api/service-history/me").param("page", "2").param("size", "5"))
                .andExpect(status().isOk());

        verify(serviceHistoryService).getServiceHistoryByCustomer(CUSTOMER_ID, pageable);
    }

    /**
     * Bất biến bảo mật: client gửi kèm {@code customerId} trong query vẫn bị bỏ qua
     * và danh tính vẫn lấy từ token. Test này là hàng rào cho trường hợp ai đó
     * sau này thêm lại tham số này vào controller.
     */
    @Test
    void listIgnoresCustomerIdQueryParamAndAlwaysUsesTokenIdentity() throws Exception {
        UUID attackerId = UUID.randomUUID();
        given(currentCustomerService.getRequiredCustomerId()).willReturn(CUSTOMER_ID);
        given(serviceHistoryService.getServiceHistoryByCustomer(
                any(UUID.class), any(PageRequest.class)))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/service-history/me").param("customerId", attackerId.toString()))
                .andExpect(status().isOk());

        verify(serviceHistoryService).getServiceHistoryByCustomer(
                CUSTOMER_ID, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate")));
        verify(serviceHistoryService, never()).getServiceHistoryByCustomer(
                eq(attackerId), any(PageRequest.class));
    }

    /**
     * Không đăng nhập / không xác định được hồ sơ thì fail closed 403 và không
     * chạm vào service — không bao giờ trả danh sách rỗng để "che" lỗi phân
     * quyền.
     */
    @Test
    void unresolvedCustomerProfileReturns403WithoutQueryingHistory() throws Exception {
        given(currentCustomerService.getRequiredCustomerId())
                .willThrow(new CustomerProfileUnresolvedException("Không xác định được hồ sơ khách hàng"));

        mvc.perform(get("/api/service-history/me"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(1403))
                .andExpect(jsonPath("$.result").doesNotExist());

        verifyNoInteractions(serviceHistoryService);
    }

    private ServiceHistoryResponse response() {
        return new ServiceHistoryResponse(UUID.randomUUID(), VEHICLE_ID, CUSTOMER_ID, null,
                ServiceRecordType.EXTERNAL_SERVICE, SERVICE_DATE, 15000, "Thay dầu",
                null, "Gara An Phú", SERVICE_DATE);
    }
}
