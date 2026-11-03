package com.example.booking_service.service;

import com.example.booking_service.capacity.BookingRescheduleContext;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.enums.BookingSource;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Các thao tác ghi/đọc DB của booking, mỗi phương thức là một transaction ngắn không gọi dịch vụ ngoài. */
public interface BookingTransactionService {

    BookingResponse create(
            BookingCreateRequest request,
            UUID customerId,
            UUID changedBy,
            List<ServiceSlot> serviceSlots,
            List<SupplyInterval> supply
    );

    BookingResponse create(
            BookingCreateRequest request,
            UUID customerId,
            UUID changedBy,
            List<ServiceSlot> serviceSlots,
            List<SupplyInterval> supply,
            BookingSource source,
            UUID createdBy,
            String initialReason
    );

    List<BookingResponse> findMine(UUID customerId);

    BookingResponse findMine(UUID customerId, UUID bookingId);

    BookingRescheduleContext findRescheduleContext(UUID customerId, UUID bookingId);

    BookingRescheduleContext findRescheduleContextForStaff(UUID bookingId);

    BookingResponse cancel(UUID customerId, UUID changedBy, UUID bookingId, String reason);

    BookingResponse cancelByStaff(UUID staffUserId, UUID bookingId, String reason);

    BookingResponse reschedule(
            UUID customerId,
            UUID bookingId,
            Instant requestedStartAt,
            List<ServiceSlot> services,
            List<SupplyInterval> supply
    );

    BookingResponse rescheduleByStaff(
            UUID bookingId,
            Instant requestedStartAt,
            List<ServiceSlot> services,
            List<SupplyInterval> supply
    );
}
