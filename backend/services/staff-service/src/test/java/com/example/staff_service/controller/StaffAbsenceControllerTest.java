package com.example.staff_service.controller;

import com.example.staff_service.dto.request.StaffAbsenceRequest;
import com.example.staff_service.dto.response.StaffAbsenceResponse;
import com.example.staff_service.exception.GlobalExceptionHandler;
import com.example.staff_service.service.StaffAbsenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StaffAbsenceControllerTest {

    @Mock
    private StaffAbsenceService absenceService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new StaffAbsenceController(absenceService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getAbsencesParsesIsoTimestampsAndReturnsIntersectingRecords() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID absenceId = UUID.randomUUID();
        Instant from = Instant.parse("2026-11-10T09:00:00Z");
        Instant to = Instant.parse("2026-11-10T12:00:00Z");
        given(absenceService.getAbsences(staffId, from, to)).willReturn(List.of(
                new StaffAbsenceResponse(absenceId, staffId, from, to, "PERSONAL", null, null, from)));

        mvc.perform(get("/api/staff/{staffId}/absences", staffId)
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].absenceId").value(absenceId.toString()));
    }

    @Test
    void createUpdateAndDeleteUseAbsenceIdScopedToStaff() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID absenceId = UUID.randomUUID();
        Instant startAt = Instant.parse("2026-11-10T09:00:00Z");
        Instant endAt = Instant.parse("2026-11-10T10:00:00Z");
        StaffAbsenceResponse response =
                new StaffAbsenceResponse(absenceId, staffId, startAt, endAt, "PERSONAL", null, null, startAt);
        given(absenceService.createAbsence(eq(staffId), any(StaffAbsenceRequest.class))).willReturn(response);
        given(absenceService.updateAbsence(eq(staffId), eq(absenceId), any(StaffAbsenceRequest.class)))
                .willReturn(response);
        String body = """
                {
                  "startAt": "2026-11-10T09:00:00Z",
                  "endAt": "2026-11-10T10:00:00Z",
                  "absenceType": "PERSONAL"
                }
                """;

        mvc.perform(post("/api/staff/{staffId}/absences", staffId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.absenceId").value(absenceId.toString()));
        mvc.perform(put("/api/staff/{staffId}/absences/{absenceId}", staffId, absenceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/staff/{staffId}/absences/{absenceId}", staffId, absenceId))
                .andExpect(status().isNoContent());

        verify(absenceService).deleteAbsence(staffId, absenceId);
    }
}
