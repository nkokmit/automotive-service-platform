package com.example.staff_service.controller;

import com.example.staff_service.dto.response.ScheduleDayResponse;
import com.example.staff_service.dto.response.StaffScheduleResponse;
import com.example.staff_service.exception.GlobalExceptionHandler;
import com.example.staff_service.service.StaffScheduleAggregationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StaffScheduleAggregationControllerTest {

    @Mock
    private StaffScheduleAggregationService scheduleAggregationService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(
                        new StaffScheduleAggregationController(scheduleAggregationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getsScheduleForStaffAndPassesInclusiveDateRange() throws Exception {
        UUID staffId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2026, 11, 2);
        LocalDate to = from.plusDays(1);
        given(scheduleAggregationService.getStaffSchedule(staffId, from, to))
                .willReturn(new StaffScheduleResponse(
                        staffId, "ST-001", "Technician",
                        List.of(new ScheduleDayResponse(from, List.of()))));

        mvc.perform(get("/api/staff/{staffId}/schedules", staffId)
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.staffId").value(staffId.toString()))
                .andExpect(jsonPath("$.result.days[0].date").value(from.toString()))
                .andExpect(jsonPath("$.result.days[0].intervals").isEmpty());

        verify(scheduleAggregationService).getStaffSchedule(staffId, from, to);
    }

    @Test
    void exposesGarageScheduleEndpoint() throws Exception {
        LocalDate from = LocalDate.of(2026, 11, 2);
        given(scheduleAggregationService.getGarageSchedule(from, from))
                .willReturn(List.of());

        mvc.perform(get("/api/schedules")
                        .param("from", from.toString())
                        .param("to", from.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray());
    }

    @Test
    void exposesAvailabilityEndpointWithExplicitInstants() throws Exception {
        Instant startAt = Instant.parse("2026-11-02T03:00:00Z");
        Instant endAt = Instant.parse("2026-11-02T04:00:00Z");
        given(scheduleAggregationService.findAvailableStaff(startAt, endAt))
                .willReturn(List.of());

        mvc.perform(get("/api/staff/availability")
                        .param("startAt", startAt.toString())
                        .param("endAt", endAt.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").isArray());

        verify(scheduleAggregationService).findAvailableStaff(startAt, endAt);
    }
}
