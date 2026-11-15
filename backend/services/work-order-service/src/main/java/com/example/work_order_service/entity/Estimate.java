package com.example.work_order_service.entity;

import com.example.work_order_service.enums.EstimateStatus;
import com.example.work_order_service.enums.EstimateType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "estimates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Estimate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @ManyToOne(optional = false)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.ENUM)
    @Column(name = "type", nullable = false)
    private EstimateType type;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.ENUM)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private EstimateStatus status = EstimateStatus.DRAFT;

    @Column(name = "total_labor_amount", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalLaborAmount = BigDecimal.ZERO;

    @Column(name = "total_parts_amount", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalPartsAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "created_by", length = 36, nullable = false)
    private UUID createdBy;

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
            status = EstimateStatus.DRAFT;
        }
        if (totalLaborAmount == null) {
            totalLaborAmount = BigDecimal.ZERO;
        }
        if (totalPartsAmount == null) {
            totalPartsAmount = BigDecimal.ZERO;
        }
        if (totalAmount == null) {
            totalAmount = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
