package com.example.booking_service.repository;

import com.example.booking_service.entity.BookingService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BookingServiceRepository extends JpaRepository<BookingService, UUID> {
    List<BookingService> findByBookingIdOrderBySequenceNumberAsc(UUID bookingId);

    /**
     * Nạp dịch vụ của nhiều booking một lần (tránh N+1 khi dựng lại tải sức chứa).
     * {@code join fetch} để không phụ thuộc session khi đọc {@code booking}.
     */
    @Query("""
            select s from BookingService s
            join fetch s.booking
            where s.booking.id in :bookingIds
            order by s.sequenceNumber asc
            """)
    List<BookingService> findAllByBookingIds(@Param("bookingIds") Collection<UUID> bookingIds);
}
