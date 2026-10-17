package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.exception.CustomerNotFoundException;
import com.example.customer_vehicle_service.exception.GlobalExceptionHandler;
import com.example.customer_vehicle_service.service.ServiceHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test hợp đồng HTTP của {@code GET /api/customers/{customerId}/service-history};
 * quyền được test riêng bằng method-security proxy.
 */
@ExtendWith(MockitoExtension.class)
class CustomerServiceHistoryByIdControllerTest {

    @Mock
    private ServiceHistoryService serviceHistoryService;
    private MockMvc mvc;
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID VEHICLE_ID = UUID.randomUUID();
    private static final Instant SERVICE_DATE = Instant.parse("2026-01-15T08:30:00Z");

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders
                .standaloneSetup(new CustomerServiceHistoryByIdController(serviceHistoryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /** Mặc định mới nhất trước, bọc trong envelope chuẩn của service. */
    @Test
    void listUsesNewestFirstByDefaultAndApiEnvelope() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(serviceHistoryService.getServiceHistoryByCustomer(CUSTOMER_ID, pageable))
                .willReturn(new PageResponse<>(List.of(response()), 0, 20, 1, 1, false, false));

        mvc.perform(get("/api/customers/{customerId}/service-history", CUSTOMER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.items[0].customerId").value(CUSTOMER_ID.toString()))
                .andExpect(jsonPath("$.result.items[0].vehicleId").value(VEHICLE_ID.toString()))
                .andExpect(jsonPath("$.result.totalElements").value(1))
                .andExpect(jsonPath("$.result.size").value(20));

        verify(serviceHistoryService).getServiceHistoryByCustomer(CUSTOMER_ID, pageable);
    }

    /** Phân trang tuỳ chỉnh được truyền xuống service nguyên vẹn. */
    @Test
    void listBindsCustomPagination() throws Exception {
        var pageable = PageRequest.of(2, 5, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(serviceHistoryService.getServiceHistoryByCustomer(CUSTOMER_ID, pageable))
                .willReturn(new PageResponse<>(List.of(), 2, 5, 0, 0, false, false));

        mvc.perform(get("/api/customers/{customerId}/service-history", CUSTOMER_ID)
                        .param("page", "2").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.page").value(2))
                .andExpect(jsonPath("$.result.size").value(5));

        verify(serviceHistoryService).getServiceHistoryByCustomer(CUSTOMER_ID, pageable);
    }

    /**
     * Hồ sơ không có lịch sử trả 200 với mảng rỗng, không phải 404 — đây là kết
     * quả hợp lệ chứ không phải lỗi, khác hẳn {@code GET /api/vehicles/{id}}
     * cố ý trả 2101 cho id sai.
     */
    @Test
    void customerWithoutHistoryReturnsEmptyPage() throws Exception {
        given(serviceHistoryService.getServiceHistoryByCustomer(eq(CUSTOMER_ID), any()))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/customers/{customerId}/service-history", CUSTOMER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.items").isEmpty())
                .andExpect(jsonPath("$.result.totalElements").value(0));
    }

    /** {@code customerId} không phải UUID là lỗi client, trả 400 chứ không rơi vào 500. */
    @Test
    void malformedCustomerIdReturns400() throws Exception {
        mvc.perform(get("/api/customers/{customerId}/service-history", "not-a-uuid")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));

        verifyNoInteractions(serviceHistoryService);
    }

    /**
     * Lịch sử phải tra được cho hồ sơ đã xoá mềm, nên controller cố ý không kiểm
     * tra tồn tại. Test khoá lại hợp đồng đó: nếu sau này thêm kiểm tra tồn tại
     * ở tầng controller/service, nhân viên sẽ mất khả năng audit hồ sơ cũ và
     * test này phải đổi.
     */
    @Test
    void softDeletedCustomerHistoryIsNotBlockedAtController() throws Exception {
        given(serviceHistoryService.getServiceHistoryByCustomer(eq(CUSTOMER_ID), any()))
                .willThrow(new CustomerNotFoundException("Không tìm thấy khách hàng"));

        mvc.perform(get("/api/customers/{customerId}/service-history", CUSTOMER_ID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(2001));
    }

    private ServiceHistoryResponse response() {
        return new ServiceHistoryResponse(UUID.randomUUID(), VEHICLE_ID, CUSTOMER_ID, null,
                ServiceRecordType.EXTERNAL_SERVICE, SERVICE_DATE, 15000, "Thay dầu",
                null, "Gara An Phú", SERVICE_DATE);
    }
}
