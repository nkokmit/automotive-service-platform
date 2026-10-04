package com.example.user_service.repository;

import com.example.user_service.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Tìm user theo username. Soft-deleted user tự động bị loại nhờ {@code @SQLRestriction}.
     */
    Optional<User> findByUsername(String username);

    /**
     * Tìm user theo email. Soft-deleted user tự động bị loại nhờ {@code @SQLRestriction}.
     */
    Optional<User> findByEmail(String email);

    /**
     * Kiểm tra username đã tồn tại (chưa bị xoá).
     */
    boolean existsByUsername(String username);

    /**
     * Kiểm tra email đã tồn tại (chưa bị xoá).
     */
    boolean existsByEmail(String email);

    /**
     * Lấy user theo ID kể cả khi đã soft delete (native query để bypass {@code @SQLRestriction}).
     */
    @Query(value = "SELECT * FROM users WHERE id = :id", nativeQuery = true)
    Optional<User> findByIdRaw(@Param("id") UUID id);

    /**
     * Phân trang user chưa bị xoá.
     */
    Page<User> findAll(Pageable pageable);
}


