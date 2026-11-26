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
     *
     * <p>Tham số nhận dạng {@link String} (hex 36 ký tự) vì Hibernate bind
     * {@link UUID} trong native query thành binary 16 byte, không khớp cột
     * {@code varchar(36)}.
     */
    @Query(value = "SELECT * FROM permissions WHERE id = :id", nativeQuery = true)
    Optional<Permission> findByIdRaw(@Param("id") String id);
}

