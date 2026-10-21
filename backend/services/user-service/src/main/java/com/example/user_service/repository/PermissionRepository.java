package com.example.user_service.repository;

import com.example.user_service.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByName(String name);

    boolean existsByName(String name);

    /**
     * Lấy permission theo ID kể cả khi đã soft delete (native query để bypass {@code @SQLRestriction}).
     */
    @Query(value = "SELECT * FROM permissions WHERE id = :id", nativeQuery = true)
    Optional<Permission> findByIdRaw(@Param("id") UUID id);
}

