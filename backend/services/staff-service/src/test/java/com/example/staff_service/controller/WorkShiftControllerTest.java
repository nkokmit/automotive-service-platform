package com.example.staff_service.controller;

import com.example.staff_service.dto.response.PageResponse;
import com.example.staff_service.dto.response.WorkShiftResponse;
import com.example.staff_service.exception.GlobalExceptionHandler;
import com.example.staff_service.service.WorkShiftService;
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

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class WorkShiftControllerTest {

    @Mock
    private WorkShiftService workShiftService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new WorkShiftController(workShiftService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void listUsesDefaultPaginationAndSorting() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "startTime"));
        given(workShiftService.getWorkShifts(null, null, pageable))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/work-shifts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.items").isEmpty())
                .andExpect(jsonPath("$.result.size").value(20));
    }

    @Test
    void listAcceptsIsActiveFilter() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "startTime"));
        given(workShiftService.getWorkShifts(null, false, pageable))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/work-shifts").param("isActive", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.items").isEmpty());
    }

    @Test
    void updateIsActiveUsesBooleanContract() throws Exception {
        UUID id = UUID.randomUUID();
        given(workShiftService.updateWorkShiftIsActive(id, false)).willReturn(
                new WorkShiftResponse(id, "MORNING", "Ca sáng", null, null,
                        false, null, null));

        mvc.perform(patch("/api/work-shifts/{id}/is-active", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.isActive").value(false));
    }

    @Test
    void deleteSoftDeleteEndpointReturnsNoContent() throws Exception {
        UUID id = UUID.randomUUID();

        mvc.perform(delete("/api/work-shifts/{id}", id))
                .andExpect(status().isNoContent());
    }
}
