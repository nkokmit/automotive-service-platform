package com.example.customer_vehicle_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Entity đại diện cho hồ sơ khách hàng.
 *
 * <p>Soft delete được áp dụng thông qua {@code @SQLRestriction} — mọi truy vấn
 * JPA sẽ tự động bỏ qua khách hàng đã bị xoá ({@code deleted_at IS NOT NULL}).
 *
 * <p>{@code userId} là ID tài khoản ở {@code user-service}: cross-service nên
 * chỉ lưu ID dạng {@link UUID}, không tạo JPA relationship hay foreign key
 * (GLOBAL_RULES §2).
 */
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLRestriction("deleted_at IS NULL")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    /**
     * ID tài khoản ở {@code user-service}: cross-service nên chỉ lưu ID, không
     * có foreign key (GLOBAL_RULES §2). Cột là {@code VARCHAR(36)} nên phải khai
     * báo {@code @JdbcTypeCode} — nếu không Hibernate 7 sẽ mặc định map UUID
     * thành {@code binary(36)} và validate fail.
     */
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "user_id", length = 36)
    private UUID userId;

    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Column(name = "phone", length = 20, nullable = false)
    private String phone;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Khách hàng còn hoạt động trong hệ thống hay không.
     * Khác với soft delete: bản ghi vẫn hiển thị được khi is_active = false.
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = Boolean.TRUE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.isActive == null) {
            this.isActive = Boolean.TRUE;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}