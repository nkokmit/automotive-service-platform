package com.example.booking_service.service;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.enums.BookingStatus;

import java.util.UUID;

public interface BookingStatusHistoryService {
    void recordInitialStatus(Booking booking, UUID changedBy, String reason);

    void recordTransition(
            Booking booking,
            BookingStatus fromStatus,
            BookingStatus toStatus,
            UUID changedBy,
            String reason
    );
}
