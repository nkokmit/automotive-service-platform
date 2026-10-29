package com.example.inventory_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Part {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private PartCategory category;

    @Column(name = "sku", length = 50, nullable = false, unique = true)
    private String sku;

    @Column(name = "oem_code", length = 50)
    private String oemCode;

    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @Column(name = "brand", length = 100)
    private String brand;

    @Column(name = "unit", length = 20, nullable = false)
    private String unit;

    @Column(name = "cost_price", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "selling_price", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal sellingPrice = BigDecimal.ZERO;

    @Column(name = "on_hand_stock", nullable = false)
    @Builder.Default
    private Integer onHandStock = 0;

    @Column(name = "reserved_stock", nullable = false)
    @Builder.Default
    private Integer reservedStock = 0;

    @Column(name = "min_stock_level", nullable = false)
    @Builder.Default
    private Integer minStockLevel = 5;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = Boolean.TRUE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (costPrice == null) costPrice = BigDecimal.ZERO;
        if (sellingPrice == null) sellingPrice = BigDecimal.ZERO;
        if (onHandStock == null) onHandStock = 0;
        if (reservedStock == null) reservedStock = 0;
        if (minStockLevel == null) minStockLevel = 5;
        if (isActive == null) isActive = Boolean.TRUE;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
