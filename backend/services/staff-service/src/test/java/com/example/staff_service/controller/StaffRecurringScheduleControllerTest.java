package com.example.staff_service.controller;

import com.example.staff_service.dto.request.RecurringScheduleReplaceRequest;
import com.example.staff_service.dto.response.StaffRecurringScheduleResponse;
import com.example.staff_service.exception.ApiException;
import com.example.staff_service.exception.ErrorCode;
import com.example.staff_service.exception.GlobalExceptionHandler;
import com.example.staff_service.service.StaffRecurringScheduleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StaffRecurringScheduleControllerTest {

    @Mock
    private StaffRecurringScheduleService scheduleService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new StaffRecurringScheduleController(scheduleService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getSchedulesReturnsConfiguredSchedules() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID scheduleId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        given(scheduleService.getRecurringSchedules(staffId)).willReturn(List.of(
                new StaffRecurringScheduleResponse(scheduleId, shiftId, DayOfWeek.MONDAY,
                        LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30))));

        mvc.perform(get("/api/staff/{staffId}/recurring-schedules", staffId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].scheduleId").value(scheduleId.toString()))
                .andExpect(jsonPath("$.result[0].dayOfWeek").value("MONDAY"));
    }

    @Test
    void putSchedulesPassesRangeAndWeeklyShiftsToService() throws Exception {
        UUID staffId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        given(scheduleService.replaceRecurringSchedules(
                org.mockito.ArgumentMatchers.eq(staffId),
                org.mockito.ArgumentMatchers.any(RecurringScheduleReplaceRequest.class)))
                .willReturn(List.of());

        mvc.perform(put("/api/staff/{staffId}/recurring-schedules", staffId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "effectiveFrom": "2026-11-10",
                                  "effectiveTo": "2026-11-20",
                                  "weeklySchedules": [
                                    {
                                      "dayOfWeek": "MONDAY",
                                      "shiftIds": ["%s"]
                                    }
                                  ]
                                }
                                """.formatted(shiftId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        verify(scheduleService).replaceRecurringSchedules(
                org.mockito.ArgumentMatchers.eq(staffId),
                org.mockito.ArgumentMatchers.argThat(request ->
                        request.effectiveFrom().equals(LocalDate.of(2026, 11, 10))
                                && request.effectiveTo().equals(LocalDate.of(2026, 11, 20))
                                && request.weeklySchedules().get(0).dayOfWeek() == DayOfWeek.MONDAY));
    }

    @Test
    void putSchedulesRejectsMalformedPeriod() throws Exception {
        UUID staffId = UUID.randomUUID();
        given(scheduleService.replaceRecurringSchedules(
                org.mockito.ArgumentMatchers.eq(staffId),
                org.mockito.ArgumentMatchers.any(RecurringScheduleReplaceRequest.class)))
                .willThrow(new ApiException(ErrorCode.INVALID_REQUEST,
                        "Ngày kết thúc hiệu lực phải bằng hoặc sau ngày bắt đầu"));

        mvc.perform(put("/api/staff/{staffId}/recurring-schedules", staffId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "effectiveFrom": "2026-11-20",
                                  "effectiveTo": "2026-11-10",
                                  "weeklySchedules": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
    }
}
