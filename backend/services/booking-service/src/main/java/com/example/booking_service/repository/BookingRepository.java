package com.example.booking_service.repository;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    @Query("""
            select b from Booking b
            where b.status in :holdingStatuses
              and b.startAt < :endAt
              and b.endAt > :startAt
            order by b.startAt asc
            """)
    List<Booking> findCapacityBookingsOverlapping(
            @Param("startAt") Instant startAt,
            @Param("endAt") Instant endAt,
            @Param("holdingStatuses") List<BookingStatus> holdingStatuses
    );
}
