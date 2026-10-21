package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.exception.GlobalExceptionHandler;
import com.example.customer_vehicle_service.exception.ServiceHistoryInvalidTypeException;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.service.ServiceHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Test binding/validation/response; quyền được test riêng bằng method-security proxy. */
@ExtendWith(MockitoExtension.class)
class VehicleServiceHistoryControllerTest {

    @Mock
    private ServiceHistoryService serviceHistoryService;
    private MockMvc mvc;
    private static final UUID VEHICLE_ID = UUID.randomUUID();
    /** Khách đã mang xe tới lần tiếp nhận — không phải chủ sở hữu. */
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final Instant SERVICE_DATE = Instant.parse("2026-01-15T08:30:00Z");

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders
                .standaloneSetup(new VehicleServiceHistoryController(serviceHistoryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void listUsesNewestFirstByDefaultAndApiEnvelope() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(serviceHistoryService.getServiceHistory(VEHICLE_ID, pageable))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.items").isEmpty())
                .andExpect(jsonPath("$.result.size").value(20));
    }

    @Test
    void listBindsCustomPagination() throws Exception {
        var pageable = PageRequest.of(1, 5, Sort.by(Sort.Direction.ASC, "serviceDate"));
        given(serviceHistoryService.getServiceHistory(VEHICLE_ID, pageable))
                .willReturn(new PageResponse<>(List.of(), 1, 5, 0, 0, false, true));

        mvc.perform(get("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .param("page", "1").param("size", "5")
                        .param("sortBy", "serviceDate").param("sortDirection", "ASC"))
                .andExpect(status().isOk());
        verify(serviceHistoryService).getServiceHistory(VEHICLE_ID, pageable);
    }

    @Test
    void createReturns201WithRecordType() throws Exception {
        given(serviceHistoryService.createServiceHistory(eq(VEHICLE_ID), any()))
                .willReturn(response());

        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordType":"EXTERNAL_SERVICE","serviceDate":"2026-01-15T08:30:00Z",
                                 "odometerKm":15000,"summary":"Thay dầu","garageName":"Gara An Phú"}
                                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.recordType").value("EXTERNAL_SERVICE"))
                .andExpect(jsonPath("$.result.vehicleId").value(VEHICLE_ID.toString()));
    }

    @Test
    void createIgnoresClientSuppliedWorkOrderId() throws Exception {
        given(serviceHistoryService.createServiceHistory(eq(VEHICLE_ID), any()))
                .willReturn(response());

        // Request DTO không có workOrderId nên Jackson bỏ qua field lạ theo mặc định.
        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordType":"EXTERNAL_SERVICE","serviceDate":"2026-01-15T08:30:00Z",
                                 "summary":"Thay dầu","workOrderId":"%s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isCreated());

        ArgumentCaptor<ServiceHistoryCreateRequest> captor =
                ArgumentCaptor.forClass(ServiceHistoryCreateRequest.class);
        verify(serviceHistoryService).createServiceHistory(eq(VEHICLE_ID), captor.capture());
        // Bản ghi lưu không có workOrderId cho client tự gán.
        assertThat(captor.getValue().recordType()).isEqualTo(ServiceRecordType.EXTERNAL_SERVICE);
    }

    @Test
    void invalidCreateReturns400WithoutCallingService() throws Exception {
        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(serviceHistoryService);
    }

    @Test
    void blankSummaryReturns400() throws Exception {
        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordType":"EXTERNAL_SERVICE","serviceDate":"2026-01-15T08:30:00Z",
                                 "summary":"   "}
                                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(serviceHistoryService);
    }

    @Test
    void negativeOdometerReturns400() throws Exception {
        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordType":"EXTERNAL_SERVICE","serviceDate":"2026-01-15T08:30:00Z",
                                 "odometerKm":-1,"summary":"Thay dầu"}
                                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(serviceHistoryService);
    }

    /**
     * Giá trị enum không tồn tại là lỗi của client, không phải lỗi server — phải trả
     * 400 kèm {@code INVALID_REQUEST} thay vì rơi xuống handler chung và trả 500.
     */
    @Test
    void unknownRecordTypeReturns400() throws Exception {
        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordType":"KHAC","serviceDate":"2026-01-15T08:30:00Z","summary":"Thay dầu"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(serviceHistoryService);
    }

    @Test
    void unknownVehicleUsesExistingVehicleErrorEnvelope() throws Exception {
        given(serviceHistoryService.getServiceHistory(eq(VEHICLE_ID), any()))
                .willThrow(new VehicleNotFoundException("Không tìm thấy xe"));

        mvc.perform(get("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(2101));
    }

    @Test
    void systemRecordTypeUsesDedicatedBusinessError() throws Exception {
        given(serviceHistoryService.createServiceHistory(eq(VEHICLE_ID), any()))
                .willThrow(new ServiceHistoryInvalidTypeException("Không thể nhập GARAGE_SERVICE"));

        mvc.perform(post("/api/vehicles/{vehicleId}/service-history", VEHICLE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordType":"GARAGE_SERVICE","serviceDate":"2026-01-15T08:30:00Z",
                                 "summary":"Thay dầu"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(2202));
    }

    private ServiceHistoryResponse response() {
        return new ServiceHistoryResponse(UUID.randomUUID(), VEHICLE_ID, CUSTOMER_ID, null,
                ServiceRecordType.EXTERNAL_SERVICE, SERVICE_DATE, 15000, "Thay dầu",
                null, "Gara An Phú", SERVICE_DATE);
    }
}