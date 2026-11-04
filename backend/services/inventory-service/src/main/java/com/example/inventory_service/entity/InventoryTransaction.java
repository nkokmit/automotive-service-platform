package com.example.inventory_service.entity;

import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.enums.ReferenceType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 20, nullable = false)
    private TransactionType type;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "stock_before", nullable = false)
    private Integer stockBefore;

    @Column(name = "stock_after", nullable = false)
    private Integer stockAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", length = 20, nullable = false)
    private ReferenceType referenceType;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "reference_id", length = 36, nullable = false)
    private UUID referenceId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "created_by", length = 36, nullable = false)
    private UUID createdBy;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
