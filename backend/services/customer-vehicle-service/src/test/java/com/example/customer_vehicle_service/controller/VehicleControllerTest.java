package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.dto.request.VehicleCreateRequest;
import com.example.customer_vehicle_service.dto.request.VehicleUpdateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.exception.GlobalExceptionHandler;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.service.VehicleService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Test binding/validation/response; quyền được test riêng bằng method-security proxy. */
@ExtendWith(MockitoExtension.class)
class VehicleControllerTest {

    @Mock
    private VehicleService vehicleService;
    private MockMvc mvc;
    private static final UUID ID = UUID.randomUUID();
    private static final UUID OWNER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new VehicleController(vehicleService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void listUsesDefaultPaginationAndApiEnvelope() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        given(vehicleService.getVehicles(null, null, null, null, pageable))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/vehicles"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.items").isEmpty())
                .andExpect(jsonPath("$.result.size").value(20));
    }

    @Test
    void listBindsFiltersAndCustomPagination() throws Exception {
        var pageable = PageRequest.of(1, 5, Sort.by(Sort.Direction.ASC, "licensePlate"));
        given(vehicleService.getVehicles(OWNER_ID, "30A-12345", "Honda", true, pageable))
                .willReturn(new PageResponse<>(List.of(), 1, 5, 0, 0, false, true));

        mvc.perform(get("/api/vehicles").param("customerId", OWNER_ID.toString())
                        .param("licensePlate", "30A-12345").param("keyword", "Honda")
                        .param("isActive", "true").param("page", "1").param("size", "5")
                        .param("sortBy", "licensePlate").param("sortDirection", "ASC"))
                .andExpect(status().isOk());
        verify(vehicleService).getVehicles(OWNER_ID, "30A-12345", "Honda", true, pageable);
    }

    @Test
    void detailReturnsPublicVehicleFields() throws Exception {
        given(vehicleService.getVehicleById(ID)).willReturn(response());

        mvc.perform(get("/api/vehicles/{id}", ID)).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.customerId").value(OWNER_ID.toString()))
                .andExpect(jsonPath("$.result.licensePlate").value("30A-12345"))
                .andExpect(jsonPath("$.result.deletedAt").doesNotExist())
                .andExpect(jsonPath("$.result.customerName").doesNotExist());
    }

    @Test
    void createReturns201() throws Exception {
        given(vehicleService.createVehicle(any(VehicleCreateRequest.class))).willReturn(response());

        mvc.perform(post("/api/vehicles").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":"%s","licensePlate":"30A-12345","make":"Honda","model":"Accord"}
                                """.formatted(OWNER_ID)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.id").value(ID.toString()));
    }

    @Test
    void updateAcceptsPartialOwnershipTransfer() throws Exception {
        given(vehicleService.updateVehicle(eq(ID), any(VehicleUpdateRequest.class))).willReturn(response());

        mvc.perform(put("/api/vehicles/{id}", ID).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":\"" + OWNER_ID + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0));
        verify(vehicleService).updateVehicle(ID, new VehicleUpdateRequest(null, null, null, null,
                null, null, null, null, null, null, null, null, OWNER_ID));
    }

    @Test
    void deleteReturns204AndDelegatesSoftDeletion() throws Exception {
        mvc.perform(delete("/api/vehicles/{id}", ID)).andExpect(status().isNoContent());
        verify(vehicleService).deleteVehicle(ID);
    }

    @Test
    void invalidCreateReturns400WithoutCallingService() throws Exception {
        mvc.perform(post("/api/vehicles").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(vehicleService);
    }

    @Test
    void blankUpdateReturns400WithoutCallingService() throws Exception {
        mvc.perform(put("/api/vehicles/{id}", ID).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"licensePlate\":\"   \"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(vehicleService);
    }

    @Test
    void unknownVehicleUsesExistingBusinessErrorEnvelope() throws Exception {
        given(vehicleService.getVehicleById(ID)).willThrow(new VehicleNotFoundException("Không tìm thấy xe"));

        mvc.perform(get("/api/vehicles/{id}", ID)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(2101));
    }

    private VehicleResponse response() {
        return new VehicleResponse(ID, OWNER_ID, "30A-12345", null, "Honda", "Accord", null,
                null, null, null, null, null, null, true, null, null);
    }
}
