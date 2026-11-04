package com.example.staff_service.controller;

import com.example.staff_service.dto.request.StaffScheduleExceptionRequest;
import com.example.staff_service.dto.response.StaffScheduleExceptionResponse;
import com.example.staff_service.entity.ScheduleExceptionType;
import com.example.staff_service.exception.GlobalExceptionHandler;
import com.example.staff_service.service.StaffScheduleExceptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
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
class StaffScheduleExceptionControllerTest {

    @Mock
    private StaffScheduleExceptionService exceptionService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new StaffScheduleExceptionController(exceptionService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getExceptionsParsesDateRange() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID exceptionId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);
        given(exceptionService.getExceptions(staffId, from, to)).willReturn(List.of(
                new StaffScheduleExceptionResponse(exceptionId, staffId, shiftId,
                        from, ScheduleExceptionType.CANCEL_SHIFT, null, null, null, null)));

        mvc.perform(get("/api/staff/{staffId}/schedule-exceptions", staffId)
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].exceptionType").value("CANCEL_SHIFT"));
    }

    @Test
    void createUpdateAndDeleteUseExceptionIdScopedToStaff() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID exceptionId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 11, 9);
        StaffScheduleExceptionResponse response = new StaffScheduleExceptionResponse(
                exceptionId, staffId, shiftId, date, ScheduleExceptionType.ADD_SHIFT,
                null, null, null, null);
        given(exceptionService.createException(eq(staffId), any(StaffScheduleExceptionRequest.class)))
                .willReturn(response);
        given(exceptionService.updateException(eq(staffId), eq(exceptionId),
                any(StaffScheduleExceptionRequest.class))).willReturn(response);
        String body = """
                {
                  "shiftId": "%s",
                  "exceptionDate": "2026-11-09",
                  "exceptionType": "ADD_SHIFT"
                }
                """.formatted(shiftId);

        mvc.perform(post("/api/staff/{staffId}/schedule-exceptions", staffId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.exceptionId").value(exceptionId.toString()));
        mvc.perform(put("/api/staff/{staffId}/schedule-exceptions/{exceptionId}", staffId, exceptionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/staff/{staffId}/schedule-exceptions/{exceptionId}", staffId, exceptionId))
                .andExpect(status().isNoContent());

        verify(exceptionService).deleteException(staffId, exceptionId);
    }
}
