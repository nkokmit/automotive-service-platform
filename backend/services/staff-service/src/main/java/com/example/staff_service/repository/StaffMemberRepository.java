package com.example.staff_service.repository;

import com.example.staff_service.entity.StaffMember;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffMemberRepository extends JpaRepository<StaffMember, UUID> {

    @Query(value = "SELECT COUNT(*) FROM staff_members WHERE LOWER(employee_code) = LOWER(:employeeCode)",
            nativeQuery = true)
    long countByEmployeeCodeIncludingDeleted(@Param("employeeCode") String employeeCode);

    @Query(value = """
            SELECT COUNT(*) FROM staff_members
            WHERE LOWER(employee_code) = LOWER(:employeeCode) AND id <> :id
            """, nativeQuery = true)
    long countByEmployeeCodeExcludingIdIncludingDeleted(@Param("employeeCode") String employeeCode,
                                                         @Param("id") String id);

    @Query(value = "SELECT COUNT(*) FROM staff_members WHERE user_id = :userId", nativeQuery = true)
    long countByUserIdIncludingDeleted(@Param("userId") String userId);

    @Query(value = "SELECT COUNT(*) FROM staff_members WHERE user_id = :userId AND id <> :id",
            nativeQuery = true)
    long countByUserIdExcludingIdIncludingDeleted(@Param("userId") String userId, @Param("id") String id);

    @Query(value = "SELECT * FROM staff_members WHERE id = :id", nativeQuery = true)
    Optional<StaffMember> findByIdIncludingDeleted(@Param("id") String id);

    List<StaffMember> findByIsActiveTrueOrderByEmployeeCodeAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StaffMember s WHERE s.id = :id")
    Optional<StaffMember> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            SELECT s FROM StaffMember s
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(s.employeeCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(s.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:isActive IS NULL OR s.isActive = :isActive)
            """)
    Page<StaffMember> search(@Param("keyword") String keyword,
                             @Param("isActive") Boolean isActive,
                             Pageable pageable);
}
