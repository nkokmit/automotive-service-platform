package com.example.staff_service.repository;

import com.example.staff_service.entity.StaffScheduleException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffScheduleExceptionRepository extends JpaRepository<StaffScheduleException, UUID> {

    List<StaffScheduleException> findByStaffIdAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
            UUID staffId,
            LocalDate from,
            LocalDate to
    );

    List<StaffScheduleException> findByStaffIdInAndExceptionDateBetweenOrderByExceptionDateAscShiftIdAsc(
            List<UUID> staffIds,
            LocalDate from,
            LocalDate to
    );

    Optional<StaffScheduleException> findByIdAndStaffId(UUID id, UUID staffId);

    boolean existsByStaffIdAndShiftIdAndExceptionDate(UUID staffId, UUID shiftId, LocalDate exceptionDate);

    boolean existsByStaffIdAndShiftIdAndExceptionDateAndIdNot(
            UUID staffId,
            UUID shiftId,
            LocalDate exceptionDate,
            UUID id
    );
}
