package com.example.work_order_service.entity;

import com.example.work_order_service.enums.WorkOrderPartStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "work_order_parts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderPartLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estimate_id", nullable = false)
    private Estimate estimate;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "source_service_line_id", length = 36)
    private UUID sourceServiceLineId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "part_id", length = 36, nullable = false)
    private UUID partId;

    @Column(name = "snapshot_name", length = 150, nullable = false)
    private String snapshotName;

    @Column(name = "snapshot_sku", length = 50, nullable = false)
    private String snapshotSku;

    @Column(name = "snapshot_unit", length = 20, nullable = false)
    private String snapshotUnit;

    @Column(name = "requested_quantity", nullable = false)
    private Integer requestedQuantity;

    @Column(name = "reserved_quantity", nullable = false)
    @Builder.Default
    private Integer reservedQuantity = 0;

    @Column(name = "issued_quantity", nullable = false)
    @Builder.Default
    private Integer issuedQuantity = 0;

    @Column(name = "released_quantity", nullable = false)
    @Builder.Default
    private Integer releasedQuantity = 0;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "total_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.ENUM)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private WorkOrderPartStatus status = WorkOrderPartStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (reservedQuantity == null) {
            reservedQuantity = 0;
        }
        if (issuedQuantity == null) {
            issuedQuantity = 0;
        }
        if (releasedQuantity == null) {
            releasedQuantity = 0;
        }
        if (status == null) {
            status = WorkOrderPartStatus.PENDING;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
