package com.example.booking_service.repository;

import com.example.booking_service.entity.BookingService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingServiceRepository extends JpaRepository<BookingService, UUID> {
    List<BookingService> findByBookingIdOrderBySequenceNumberAsc(UUID bookingId);
}
