package com.example.staff_service.repository;

import com.example.staff_service.entity.WorkShift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkShiftRepository extends JpaRepository<WorkShift, UUID> {

    @Query(value = "SELECT COUNT(*) FROM work_shifts WHERE LOWER(code) = LOWER(:code)", nativeQuery = true)
    long countByCodeIncludingDeleted(@Param("code") String code);

    @Query(value = "SELECT COUNT(*) FROM work_shifts WHERE LOWER(code) = LOWER(:code) AND id <> :id",
            nativeQuery = true)
    long countByCodeExcludingIdIncludingDeleted(@Param("code") String code, @Param("id") String id);

    @Query(value = """
            SELECT (
                (SELECT COUNT(*) FROM staff_recurring_schedules WHERE shift_id = :id)
                +
                (SELECT COUNT(*) FROM staff_schedule_exceptions WHERE shift_id = :id)
            )
            """, nativeQuery = true)
    long countScheduleReferences(@Param("id") String id);

    @Query(value = "SELECT * FROM work_shifts WHERE id = :id", nativeQuery = true)
    Optional<WorkShift> findByIdIncludingDeleted(@Param("id") String id);

    @Query("""
            SELECT s FROM WorkShift s
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:isActive IS NULL OR s.isActive = :isActive)
            """)
    Page<WorkShift> search(@Param("keyword") String keyword,
                           @Param("isActive") Boolean isActive,
                           Pageable pageable);
}
