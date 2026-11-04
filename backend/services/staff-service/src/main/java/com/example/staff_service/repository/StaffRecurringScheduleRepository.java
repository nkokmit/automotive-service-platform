package com.example.staff_service.repository;

import com.example.staff_service.entity.StaffRecurringSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface StaffRecurringScheduleRepository extends JpaRepository<StaffRecurringSchedule, UUID> {

    List<StaffRecurringSchedule> findByStaffIdOrderByDayOfWeekAscShiftIdAscEffectiveFromAsc(UUID staffId);

    @Query("""
            SELECT s FROM StaffRecurringSchedule s
            WHERE s.staffId IN :staffIds
              AND s.effectiveFrom <= :to
              AND (s.effectiveTo IS NULL OR s.effectiveTo >= :from)
            """)
    List<StaffRecurringSchedule> findEffectiveInRange(
            @Param("staffIds") List<UUID> staffIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM StaffRecurringSchedule s
            WHERE s.staffId = :staffId
              AND s.shiftId = :shiftId
              AND s.dayOfWeek = :dayOfWeek
              AND s.effectiveFrom <= :date
              AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date)
            """)
    boolean existsEffectiveSchedule(
            @Param("staffId") UUID staffId,
            @Param("shiftId") UUID shiftId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("date") LocalDate date
    );
}
