package com.example.booking_service.service;

import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Nghiệp vụ lịch hẹn phía khách hàng; gọi dịch vụ ngoài trước, rồi mới mở transaction ghi DB. */
public interface CustomerBookingService {

    BookingResponse create(BookingCreateRequest request, Jwt jwt);

    List<BookingResponse> findMine(Jwt jwt);

    BookingResponse findMine(UUID bookingId, Jwt jwt);

    BookingResponse cancel(UUID bookingId, String reason, Jwt jwt);

    BookingResponse reschedule(UUID bookingId, Instant startAt, Jwt jwt);
}
