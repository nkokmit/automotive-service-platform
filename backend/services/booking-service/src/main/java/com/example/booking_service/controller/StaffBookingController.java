package com.example.booking_service.controller;

import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.dto.request.BookingCancelRequest;
import com.example.booking_service.dto.request.BookingRescheduleRequest;
import com.example.booking_service.dto.request.StaffBookingCreateRequest;
import com.example.booking_service.dto.request.StaffBookingStatusRequest;
import com.example.booking_service.dto.request.StaffBookingVehicleRequest;
import com.example.booking_service.dto.response.StaffBookingPageResponse;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.service.StaffBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_STAFF', 'ROLE_MANAGER', 'ROLE_ADMIN')")
public class StaffBookingController {

    private final StaffBookingService staffBookingService;

    @GetMapping
    public ApiResponse<StaffBookingPageResponse> search(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) BookingSource source,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) String licensePlate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean newestFirst
    ) {
        return ApiResponse.success(staffBookingService.search(
                status, source, customerId, licensePlate, from, to, page, size, newestFirst));
    }

    @GetMapping("/{bookingId}")
    public ApiResponse<StaffBookingResponse> get(@PathVariable UUID bookingId) {
        return ApiResponse.success(staffBookingService.get(bookingId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StaffBookingResponse> create(
            @Valid @RequestBody StaffBookingCreateRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Tạo lịch hẹn thành công", staffBookingService.create(request, jwt));
    }

    @PostMapping("/{bookingId}/cancel")
    public ApiResponse<StaffBookingResponse> cancel(
            @PathVariable UUID bookingId,
            @RequestBody(required = false) @Valid BookingCancelRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String reason = request == null ? null : request.reason();
        return ApiResponse.success("Hủy lịch hẹn thành công", staffBookingService.cancel(bookingId, reason, jwt));
    }

    @PatchMapping("/{bookingId}/reschedule")
    public ApiResponse<StaffBookingResponse> reschedule(
            @PathVariable UUID bookingId,
            @Valid @RequestBody BookingRescheduleRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Đổi lịch hẹn thành công",
                staffBookingService.reschedule(bookingId, request.startAt(), jwt));
    }

    @PatchMapping("/{bookingId}/status")
    public ApiResponse<StaffBookingResponse> updateStatus(
            @PathVariable UUID bookingId,
            @Valid @RequestBody StaffBookingStatusRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success("Cập nhật trạng thái thành công",
                staffBookingService.updateStatus(bookingId, request.status(), request.reason(), jwt));
    }

    @PatchMapping("/{bookingId}/vehicle")
    public ApiResponse<StaffBookingResponse> linkVehicle(
            @PathVariable UUID bookingId,
            @Valid @RequestBody StaffBookingVehicleRequest request
    ) {
        return ApiResponse.success("Liên kết xe thành công",
                staffBookingService.linkVehicle(bookingId, request.vehicleId()));
    }

    @PostMapping("/{bookingId}/check-in")
    public ApiResponse<StaffBookingResponse> checkIn(
            @PathVariable UUID bookingId,
            @RequestBody(required = false) @Valid StaffBookingVehicleRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID vehicleId = request == null ? null : request.vehicleId();
        return ApiResponse.success("Tiếp nhận xe thành công", staffBookingService.checkIn(bookingId, vehicleId, jwt));
    }
}
