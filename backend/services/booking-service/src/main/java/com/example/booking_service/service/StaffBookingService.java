package com.example.booking_service.service;

import com.example.booking_service.dto.request.StaffBookingCreateRequest;
import com.example.booking_service.dto.response.StaffBookingPageResponse;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface StaffBookingService {

    StaffBookingResponse create(StaffBookingCreateRequest request, Jwt jwt);

    StaffBookingPageResponse search(
            BookingStatus status, BookingSource source, UUID customerId, String licensePlate,
            LocalDate from, LocalDate to, int page, int size, boolean newestFirst
    );

    StaffBookingResponse get(UUID bookingId);

    StaffBookingResponse cancel(UUID bookingId, String reason, Jwt jwt);

    StaffBookingResponse reschedule(UUID bookingId, Instant startAt, Jwt jwt);

    StaffBookingResponse checkIn(UUID bookingId, UUID vehicleId, Jwt jwt);

    StaffBookingResponse updateStatus(UUID bookingId, BookingStatus status, String reason, Jwt jwt);
}
