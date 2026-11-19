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
     * Kiểm tra email đã được dùng chưa, kể cả user đã soft delete.
     */
    @Query(value = "SELECT COUNT(*) FROM users WHERE email = :email", nativeQuery = true)
    long countByEmailIncludingDeleted(@Param("email") String email);

    /**
     * Kiểm tra email đã được user khác dùng chưa, kể cả user đã soft delete.
     *
     * <p>Ép {@code :userId} sang {@code CHAR(36)} vì cột {@code id} là
     * {@code varchar(36)} còn entity dùng {@code UUID} — bind binary sẽ không khớp.
     */
    @Query(value = "SELECT COUNT(*) FROM users WHERE email = :email AND id <> :userId",
            nativeQuery = true)
    long countByEmailAndIdNotIncludingDeleted(@Param("email") String email,
                                               @Param("userId") String userId);

    /**
     * Kiểm tra số điện thoại đã được dùng chưa, kể cả user đã soft delete.
     */
    @Query(value = "SELECT COUNT(*) FROM users WHERE phone = :phone", nativeQuery = true)
    long countByPhoneIncludingDeleted(@Param("phone") String phone);

    /**
     * Kiểm tra số điện thoại đã được user khác dùng chưa, kể cả user đã soft delete.
     */
    @Query(value = "SELECT COUNT(*) FROM users WHERE phone = :phone AND id <> :userId",
            nativeQuery = true)
    long countByPhoneAndIdNotIncludingDeleted(@Param("phone") String phone,
                                               @Param("userId") String userId);

    /**
     * Lấy user theo ID kể cả khi đã soft delete (native query để bypass {@code @SQLRestriction}).
     *
     * <p>Cột {@code id} là {@code varchar(36)} còn entity dùng {@code UUID}. Hibernate
     * bind tham số {@link UUID} trong native query thành binary 16 byte, nên phép so
     * sánh với chuỗi hex 36 ký tự không bao giờ khớp. Vì vậy tham số được nhận dưới
     * dạng {@link String} (dạng hex 36 ký tự) rồi ép ngược ở tầng service.
     */
    @Query(value = "SELECT * FROM users WHERE id = :id", nativeQuery = true)
    Optional<User> findByIdRaw(@Param("id") String id);

    /**
     * Phân trang user chưa bị xoá.
     */
    Page<User> findAll(Pageable pageable);
}
