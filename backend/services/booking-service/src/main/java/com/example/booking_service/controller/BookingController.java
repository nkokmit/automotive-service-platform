package com.example.booking_service.controller;

import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.dto.request.BookingCancelRequest;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.request.BookingRescheduleRequest;
import com.example.booking_service.dto.response.AvailabilitySlotResponse;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.service.BookingAvailabilityService;
import com.example.booking_service.service.CustomerBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingAvailabilityService availabilityService;
    private final CustomerBookingService customerBookingService;

    @GetMapping("/availability")
    @PreAuthorize("hasAuthority('BOOKING_AVAILABILITY_READ')")
    public ApiResponse<List<AvailabilitySlotResponse>> findAvailability(
            @RequestParam("from") LocalDate from,
            @RequestParam("to") LocalDate to,
            @RequestParam("serviceIds") List<UUID> serviceIds
    ) {
        return ApiResponse.success(availabilityService.findAvailable(from, to, serviceIds));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CUSTOMER_BOOKING_CREATE')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BookingResponse> createBooking(
            @Valid @RequestBody BookingCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Tạo lịch hẹn thành công", customerBookingService.create(request, jwt));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('CUSTOMER_BOOKING_READ')")
    public ApiResponse<List<BookingResponse>> findMyBookings(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(customerBookingService.findMine(jwt));
    }

    @GetMapping("/{bookingId}")
    @PreAuthorize("hasAuthority('CUSTOMER_BOOKING_READ')")
    public ApiResponse<BookingResponse> getBooking(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(customerBookingService.findMine(bookingId, jwt));
    }

    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasAuthority('CUSTOMER_BOOKING_CANCEL')")
    public ApiResponse<BookingResponse> cancelBooking(
            @PathVariable UUID bookingId,
            @RequestBody(required = false) @Valid BookingCancelRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String reason = request == null ? null : request.reason();
        return ApiResponse.success("Hủy lịch hẹn thành công", customerBookingService.cancel(bookingId, reason, jwt));
    }

    @PatchMapping("/{bookingId}/reschedule")
    @PreAuthorize("hasAuthority('CUSTOMER_BOOKING_RESCHEDULE')")
    public ApiResponse<BookingResponse> rescheduleBooking(
            @PathVariable UUID bookingId,
            @Valid @RequestBody BookingRescheduleRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Đổi lịch hẹn thành công",
                customerBookingService.reschedule(bookingId, request.startAt(), jwt));
    }
}
