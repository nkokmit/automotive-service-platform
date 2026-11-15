package com.example.booking_service.mapper;

import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.dto.response.BookingServiceResponse;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;

import java.util.Comparator;
import java.util.List;

public final class BookingMapper {

    private BookingMapper() {
    }

    public static BookingResponse toResponse(Booking booking, List<BookingService> serviceLines) {
        return new BookingResponse(booking.getId(), booking.getCustomerId(), booking.getVehicleId(),
                booking.getLicensePlateSnapshot(), booking.getStartAt(), booking.getEndAt(), booking.getStatus(),
                booking.getCustomerNote(), toServiceResponses(serviceLines),
                booking.getCreatedAt(), booking.getUpdatedAt());
    }

    public static StaffBookingResponse toStaffResponse(Booking b, List<BookingService> serviceLines) {
        return new StaffBookingResponse(b.getId(), b.getCustomerId(), b.getVehicleId(), b.getWorkOrderId(),
                b.getLicensePlateSnapshot(), b.getStartAt(), b.getEndAt(), b.getStatus(), b.getSource(),
                b.getCreatedBy(), b.getCustomerNote(), toServiceResponses(serviceLines),
                b.getCreatedAt(), b.getUpdatedAt(), b.getCancelledAt(), b.getCheckedInAt());
    }

    public static ServiceSlot toServiceSlot(BookingService line) {
        return new ServiceSlot(line.getServiceId(), line.getServiceNameSnapshot(),
                line.getEstimatedDurationMinutes(), line.getRequiredTechniciansSnapshot());
    }

    private static List<BookingServiceResponse> toServiceResponses(List<BookingService> serviceLines) {
        return serviceLines.stream()
                .sorted(Comparator.comparing(BookingService::getSequenceNumber))
                .map(line -> new BookingServiceResponse(line.getServiceId(), line.getServiceNameSnapshot(),
                        line.getEstimatedDurationMinutes(), line.getRequiredTechniciansSnapshot(),
                        line.getSequenceNumber()))
                .toList();
    }
}
