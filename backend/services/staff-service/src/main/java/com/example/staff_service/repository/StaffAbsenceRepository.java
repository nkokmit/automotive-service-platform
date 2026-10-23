package com.example.staff_service.repository;

import com.example.staff_service.entity.StaffAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffAbsenceRepository extends JpaRepository<StaffAbsence, UUID> {

    List<StaffAbsence> findByStaffIdAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
            UUID staffId,
            Instant to,
            Instant from
    );

    List<StaffAbsence> findByStaffIdInAndStartAtBeforeAndEndAtAfterOrderByStartAtAsc(
            List<UUID> staffIds,
            Instant to,
            Instant from
    );

    Optional<StaffAbsence> findByIdAndStaffId(UUID id, UUID staffId);
}
