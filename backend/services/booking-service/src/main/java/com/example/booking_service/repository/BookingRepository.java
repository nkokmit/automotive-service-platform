package com.example.booking_service.repository;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query(value = "INSERT IGNORE INTO booking_capacity_day_locks (lock_date) VALUES (:lockDate)", nativeQuery = true)
    void insertCapacityDayLockIfAbsent(@Param("lockDate") LocalDate lockDate);

    @Query(value = "SELECT lock_date FROM booking_capacity_day_locks WHERE lock_date = :lockDate FOR UPDATE",
            nativeQuery = true)
    java.sql.Date lockCapacityDay(@Param("lockDate") LocalDate lockDate);

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

    @Query("""
            select b from Booking b
            where b.status in :holdingStatuses
              and b.id <> :excludedBookingId
              and b.startAt < :endAt
              and b.endAt > :startAt
            order by b.startAt asc
            """)
    List<Booking> findCapacityBookingsOverlappingExcluding(
            @Param("startAt") Instant startAt,
            @Param("endAt") Instant endAt,
            @Param("holdingStatuses") List<BookingStatus> holdingStatuses,
            @Param("excludedBookingId") UUID excludedBookingId
    );

    List<Booking> findByCustomerIdOrderByStartAtDesc(UUID customerId);

    Optional<Booking> findByIdAndCustomerId(UUID id, UUID customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id and b.customerId = :customerId")
    Optional<Booking> findByIdAndCustomerIdForUpdate(
            @Param("id") UUID id,
            @Param("customerId") UUID customerId
    );
}
