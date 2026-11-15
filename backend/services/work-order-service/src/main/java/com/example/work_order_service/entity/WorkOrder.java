package com.example.work_order_service.entity;

import com.example.work_order_service.enums.WorkOrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.hibernate.type.SqlTypes;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "booking_id", length = 36, nullable = false, unique = true)
    private UUID bookingId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "customer_id", length = 36, nullable = false)
    private UUID customerId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "vehicle_id", length = 36, nullable = false)
    private UUID vehicleId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "advisor_id", length = 36, nullable = false)
    private UUID advisorId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.ENUM)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private WorkOrderStatus status = WorkOrderStatus.CREATED;

    @Column(name = "odometer_in", nullable = false)
    private Integer odometerIn;

    @Column(name = "odometer_out")
    private Integer odometerOut;

    @Column(name = "vehicle_condition", columnDefinition = "TEXT")
    private String vehicleCondition;

    @Column(name = "customer_note", columnDefinition = "TEXT")
    private String customerNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = WorkOrderStatus.CREATED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
