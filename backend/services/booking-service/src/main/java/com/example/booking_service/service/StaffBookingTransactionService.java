package com.example.booking_service.service;

import com.example.booking_service.dto.response.StaffBookingPageResponse;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;

import java.time.Instant;
import java.util.UUID;

/** Các thao tác DB (tìm kiếm, liên kết xe, check-in, đổi trạng thái) dành cho nhân viên, mỗi phương thức là một transaction. */
public interface StaffBookingTransactionService {

    StaffBookingPageResponse search(
            BookingStatus status,
            BookingSource source,
            UUID customerId,
            String licensePlate,
            Instant from,
            Instant toExclusive,
            int page,
            int size,
            boolean newestFirst
    );

    StaffBookingResponse get(UUID bookingId);

    StaffBookingResponse checkIn(
            UUID bookingId,
            UUID vehicleId,
            String verifiedPlate,
            Integer odometerIn,
            String vehicleCondition,
            String customerNote,
            UUID staffUserId
    );

    StaffBookingResponse updateStatus(UUID bookingId, BookingStatus target, String reason, UUID staffUserId);
}
