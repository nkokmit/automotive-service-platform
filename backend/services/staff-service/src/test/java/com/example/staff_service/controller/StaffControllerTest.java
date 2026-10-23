package com.example.staff_service.controller;

import com.example.staff_service.dto.request.StaffCreateRequest;
import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.StaffResponse;
import com.example.staff_service.exception.GlobalExceptionHandler;
import com.example.staff_service.service.StaffService;
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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StaffControllerTest {

    @Mock
    private StaffService staffService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new StaffController(staffService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void listUsesDefaultPaginationAndApiEnvelope() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        given(staffService.getStaff(null, null, pageable))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/staff"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.items").isEmpty())
                .andExpect(jsonPath("$.result.size").value(20));
    }

    @Test
    void createReturns201AndValidatesRequiredFields() throws Exception {
        UUID id = UUID.randomUUID();
        given(staffService.createStaff(any(StaffCreateRequest.class))).willReturn(
                new StaffResponse(id, null, "EMP-001", "Nguyen Van A", null, null, null,
                        true, null, null));

        mvc.perform(post("/api/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"employeeCode":"EMP-001","fullName":"Nguyen Van A"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.id").value(id.toString()));

        mvc.perform(post("/api/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
    }

    @Test
    void listRejectsInvalidIsActive() throws Exception {
        mvc.perform(get("/api/staff").param("isActive", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
        verifyNoInteractions(staffService);
    }

    @Test
    void updateIsActiveUsesBooleanContract() throws Exception {
        UUID id = UUID.randomUUID();
        given(staffService.updateStaffIsActive(id, false)).willReturn(
                new StaffResponse(id, null, "EMP-001", "Nguyen Van A", null, null, null,
                        false, null, null));

        mvc.perform(patch("/api/staff/{id}/is-active", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.isActive").value(false));
    }

    @Test
    void deleteSoftDeleteEndpointReturnsNoContent() throws Exception {
        UUID id = UUID.randomUUID();

        mvc.perform(delete("/api/staff/{id}", id))
                .andExpect(status().isNoContent());

        verify(staffService).deleteStaff(id);
    }
}
