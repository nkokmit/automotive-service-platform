package com.example.booking_service.controller;

import com.example.booking_service.dto.request.StaffBookingCreateRequest;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.CustomAccessDeniedHandler;
import com.example.booking_service.exception.CustomAuthenticationEntryPoint;
import com.example.booking_service.exception.GlobalExceptionHandler;
import com.example.booking_service.security.SecurityConfig;
import com.example.booking_service.service.StaffBookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StaffBookingController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class,
        CustomAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class StaffBookingControllerTest {

    private static final UUID BOOKING_ID = UUID.randomUUID();
    private static final UUID SERVICE_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private StaffBookingService staffBookingService;
    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void roleWithoutPermissionCannotUseStaffEndpoints() throws Exception {
        mvc.perform(get("/api/staff/bookings/{id}", BOOKING_ID)
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_MANAGER"))))
                .andExpect(status().isForbidden());

        verify(staffBookingService, never()).get(any());
    }

    @Test
    void staffCanReadBooking() throws Exception {
        given(staffBookingService.get(BOOKING_ID)).willReturn(response(BookingStatus.CONFIRMED));

        mvc.perform(get("/api/staff/bookings/{id}", BOOKING_ID)
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_READ"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.source").value("PHONE"))
                .andExpect(jsonPath("$.result.status").value("CONFIRMED"));
    }

    @Test
    void staffCanCreateOfflineBooking() throws Exception {
        given(staffBookingService.create(any(StaffBookingCreateRequest.class), any()))
                .willReturn(response(BookingStatus.CONFIRMED));
        String body = """
                {"source":"PHONE","startAt":"%s","serviceIds":["%s"],"licensePlate":"51A-12345",
                 "customerId":"%s"}
                """.formatted(Instant.now().plusSeconds(86400), SERVICE_ID, UUID.randomUUID());

        mvc.perform(post("/api/staff/bookings")
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_CREATE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.id").value(BOOKING_ID.toString()));
    }

    @Test
    void createRejectsMissingSource() throws Exception {
        String body = """
                {"startAt":"%s","serviceIds":["%s"],"licensePlate":"51A-12345","customerId":"%s"}
                """.formatted(Instant.now().plusSeconds(86400), SERVICE_ID, UUID.randomUUID());

        mvc.perform(post("/api/staff/bookings")
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_CREATE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(staffBookingService, never()).create(any(), any());
    }

    @Test
    void staffCanUpdateStatus() throws Exception {
        given(staffBookingService.updateStatus(any(), any(), any(), any()))
                .willReturn(response(BookingStatus.NO_SHOW));

        mvc.perform(patch("/api/staff/bookings/{id}/status", BOOKING_ID)
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_STATUS_UPDATE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"NO_SHOW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.status").value("NO_SHOW"));
    }

    @Test
    void staffOperationsRequireTheirOwnPermissions() throws Exception {
        Instant nextStart = Instant.now().plusSeconds(7200);
        UUID vehicleId = UUID.randomUUID();

        mvc.perform(post("/api/staff/bookings/{id}/cancel", BOOKING_ID)
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_CANCEL"))))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/staff/bookings/{id}/reschedule", BOOKING_ID)
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_RESCHEDULE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startAt\":\"" + nextStart + "\"}"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/staff/bookings/{id}/check-in", BOOKING_ID)
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_CHECK_IN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vehicleId\":\"" + vehicleId + "\",\"odometerIn\":1200}"))
                .andExpect(status().isOk());

        verify(staffBookingService).checkIn(
                eq(BOOKING_ID),
                org.mockito.ArgumentMatchers.argThat(request ->
                        request.vehicleId().equals(vehicleId) && request.odometerIn() == 1200),
                any());
    }

    @Test
    void readPermissionDoesNotGrantStaffBookingCreation() throws Exception {
        String body = """
                {"source":"PHONE","startAt":"%s","serviceIds":["%s"],"licensePlate":"51A-12345",
                 "customerId":"%s"}
                """.formatted(Instant.now().plusSeconds(86400), SERVICE_ID, UUID.randomUUID());

        mvc.perform(post("/api/staff/bookings")
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_READ")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        verify(staffBookingService, never()).create(any(), any());
    }

    private StaffBookingResponse response(BookingStatus status) {
        Instant now = Instant.now();
        return new StaffBookingResponse(BOOKING_ID, UUID.randomUUID(), null, null, "51A-12345",
                now.plusSeconds(3600), now.plusSeconds(7200), status, BookingSource.PHONE, UUID.randomUUID(),
                null, List.of(), now, now, null, null);
    }
}
