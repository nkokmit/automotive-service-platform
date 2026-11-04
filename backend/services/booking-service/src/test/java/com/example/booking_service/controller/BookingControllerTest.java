package com.example.booking_service.controller;

import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.AvailabilitySlotResponse;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.CustomAccessDeniedHandler;
import com.example.booking_service.exception.CustomAuthenticationEntryPoint;
import com.example.booking_service.exception.GlobalExceptionHandler;
import com.example.booking_service.security.SecurityConfig;
import com.example.booking_service.service.BookingAvailabilityService;
import com.example.booking_service.service.CustomerBookingService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookingController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class,
        CustomAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class BookingControllerTest {

    private static final UUID SERVICE_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private BookingAvailabilityService availabilityService;
    @MockitoBean
    private CustomerBookingService customerBookingService;
    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void customerCanGetAvailableSlots() throws Exception {
        LocalDate day = LocalDate.now().plusDays(1);
        Instant start = day.atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
        given(availabilityService.findAvailable(day, day, List.of(SERVICE_ID)))
                .willReturn(List.of(new AvailabilitySlotResponse(start, start.plusSeconds(1800))));

        mvc.perform(get("/api/bookings/availability")
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_AVAILABILITY_READ")))
                        .param("from", day.toString())
                        .param("to", day.toString())
                        .param("serviceIds", SERVICE_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result[0].startAt").exists())
                .andExpect(jsonPath("$.result[0].endAt").exists());
    }

    @Test
    void roleWithoutPermissionCannotUseCustomerBookingEndpoints() throws Exception {
        LocalDate day = LocalDate.now().plusDays(1);

        mvc.perform(get("/api/bookings/availability")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                        .param("from", day.toString())
                        .param("to", day.toString())
                        .param("serviceIds", SERVICE_ID.toString()))
                .andExpect(status().isForbidden());

        verify(availabilityService, never()).findAvailable(any(), any(), any());
    }

    @Test
    void unauthenticatedCallerCannotSearchAvailability() throws Exception {
        LocalDate day = LocalDate.now().plusDays(1);

        mvc.perform(get("/api/bookings/availability")
                        .param("from", day.toString())
                        .param("to", day.toString())
                        .param("serviceIds", SERVICE_ID.toString()))
                .andExpect(status().isUnauthorized());

        verify(availabilityService, never()).findAvailable(any(), any(), any());
    }

    @Test
    void missingAvailabilityParametersReturnBadRequest() throws Exception {
        mvc.perform(get("/api/bookings/availability")
                        .with(jwt().authorities(new SimpleGrantedAuthority("BOOKING_AVAILABILITY_READ"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));

        verify(availabilityService, never()).findAvailable(any(), any(), any());
    }

    @Test
    void createUsesAuthenticatedJwtAndReturnsCreatedBooking() throws Exception {
        Instant start = Instant.now().plusSeconds(3600);
        BookingResponse response = new BookingResponse(
                UUID.randomUUID(), CUSTOMER_ID, null, "51A-12345", start, start.plusSeconds(1800),
                BookingStatus.CONFIRMED, null, List.of(), start, start);
        given(customerBookingService.create(any(BookingCreateRequest.class), any())).willReturn(response);

        mvc.perform(post("/api/bookings")
                        .with(jwt()
                                .jwt(token -> token.claim("userId", USER_ID.toString()))
                                .authorities(new SimpleGrantedAuthority("CUSTOMER_BOOKING_CREATE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "startAt": "%s",
                                  "serviceIds": ["%s"],
                                  "licensePlate": "51A-12345",
                                  "customerId": "%s"
                                }
                                """.formatted(start, SERVICE_ID, UUID.randomUUID())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.customerId").value(CUSTOMER_ID.toString()))
                .andExpect(jsonPath("$.result.status").value("CONFIRMED"));

        ArgumentCaptor<BookingCreateRequest> request = ArgumentCaptor.forClass(BookingCreateRequest.class);
        ArgumentCaptor<Jwt> token = ArgumentCaptor.forClass(Jwt.class);
        verify(customerBookingService).create(request.capture(), token.capture());
        org.junit.jupiter.api.Assertions.assertEquals(List.of(SERVICE_ID), request.getValue().serviceIds());
        org.junit.jupiter.api.Assertions.assertEquals("51A-12345", request.getValue().licensePlate());
        org.junit.jupiter.api.Assertions.assertEquals(USER_ID.toString(),
                token.getValue().getClaimAsString("userId"));
    }

    @Test
    void customerCanListAndReadOwnBookings() throws Exception {
        UUID bookingId = UUID.randomUUID();
        Instant start = Instant.now().plusSeconds(3600);
        BookingResponse response = new BookingResponse(bookingId, CUSTOMER_ID, null, "51A-12345",
                start, start.plusSeconds(1800), BookingStatus.CONFIRMED, null, List.of(), start, start);
        given(customerBookingService.findMine(any())).willReturn(List.of(response));
        given(customerBookingService.findMine(eq(bookingId), any())).willReturn(response);

        mvc.perform(get("/api/bookings/me")
                        .with(jwt().authorities(new SimpleGrantedAuthority("CUSTOMER_BOOKING_READ"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].id").value(bookingId.toString()));

        mvc.perform(get("/api/bookings/{id}", bookingId)
                        .with(jwt().authorities(new SimpleGrantedAuthority("CUSTOMER_BOOKING_READ"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.id").value(bookingId.toString()));
    }

    @Test
    void customerCanRequestCancellationAndReschedule() throws Exception {
        UUID bookingId = UUID.randomUUID();
        Instant start = Instant.now().plusSeconds(7200);
        BookingResponse response = new BookingResponse(bookingId, CUSTOMER_ID, null, "51A-12345",
                start, start.plusSeconds(1800), BookingStatus.CONFIRMED, null, List.of(), start, start);
        BookingResponse cancelled = new BookingResponse(bookingId, CUSTOMER_ID, null, "51A-12345",
                start, start.plusSeconds(1800), BookingStatus.CANCELLED, null, List.of(), start, start);
        given(customerBookingService.cancel(eq(bookingId), eq("Customer request"), any())).willReturn(cancelled);
        given(customerBookingService.reschedule(eq(bookingId), any(), any())).willReturn(response);

        mvc.perform(post("/api/bookings/{id}/cancel", bookingId)
                        .with(jwt().authorities(new SimpleGrantedAuthority("CUSTOMER_BOOKING_CANCEL")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Customer request\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.status").value("CANCELLED"));

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/bookings/{id}/reschedule", bookingId)
                        .with(jwt().authorities(new SimpleGrantedAuthority("CUSTOMER_BOOKING_RESCHEDULE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startAt\":\"" + start.plusSeconds(3600) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.id").value(bookingId.toString()));

        verify(customerBookingService).cancel(eq(bookingId), eq("Customer request"), any());
        verify(customerBookingService).reschedule(eq(bookingId), eq(start.plusSeconds(3600)), any());
    }
}
