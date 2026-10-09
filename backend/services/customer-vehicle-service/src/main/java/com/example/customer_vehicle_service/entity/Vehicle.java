package com.example.customer_vehicle_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
 * Entity đại diện cho xe của khách hàng.
 *
 * <p>Mỗi xe có đúng một chủ sở hữu hiện tại ({@link Customer}). Đây là quan hệ
 * nội bộ của service nên dùng {@code @ManyToOne} + foreign key trong DB.
 *
 * <p>Soft delete được áp dụng thông qua {@code @SQLRestriction} — mọi truy vấn
 * JPA sẽ tự động bỏ qua xe đã bị xoá ({@code deleted_at IS NOT NULL}).
 */
@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLRestriction("deleted_at IS NULL")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    /**
     * Quan hệ nội bộ: khách hàng đang sở hữu xe.
     * LAZY + cùng {@code @SQLRestriction} để xe của khách hàng đã xoá mềm
     * cũng không bị trả về trong các truy vấn thông thường.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "license_plate", length = 20, nullable = false)
    private String licensePlate;

    @Column(name = "vin", length = 17)
    private String vin;

    @Column(name = "make", length = 100, nullable = false)
    private String make;

    @Column(name = "model", length = 100, nullable = false)
    private String model;

    /**
     * Năm sản xuất. Dùng {@code Short} để khớp {@code SMALLINT} trong
     * migration — nếu dùng {@code Integer}, Hibernate validate sẽ kỳ vọng
     * {@code INT} và fail.
     */
    @Column(name = "model_year")
    private Short modelYear;

    @Column(name = "trim", length = 100)
    private String trim;

    @Column(name = "color", length = 50)
    private String color;

    @Column(name = "fuel_type", length = 30)
    private String fuelType;

    @Column(name = "transmission", length = 30)
    private String transmission;

    /**
     * Số km gần nhất đã ghi nhận. Không thay thế lịch sử số km: mỗi bản ghi lịch
     * sử bảo dưỡng lưu {@code odometer_km} tại thời điểm dịch vụ.
     */
    @Column(name = "odometer_km")
    private Integer odometerKm;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Xe còn hoạt động trong hệ thống hay không. Khác với soft delete.
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