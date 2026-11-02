package com.example.booking_service.repository;

import com.example.booking_service.entity.BookingStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingStatusHistoryRepository extends JpaRepository<BookingStatusHistory, UUID> {
    List<BookingStatusHistory> findByBooking_IdOrderByChangedAtAsc(UUID bookingId);
}
