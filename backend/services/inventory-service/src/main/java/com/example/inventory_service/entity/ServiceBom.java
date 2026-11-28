package com.example.inventory_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "service_boms", uniqueConstraints = @UniqueConstraint(
        name = "uk_sb_service_part_vehicle", columnNames = {"service_id", "part_id", "brand", "model"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceBom {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(name = "brand", length = 100, nullable = false)
    @Builder.Default
    private String brand = "ALL";

    @Column(name = "model", length = 100, nullable = false)
    @Builder.Default
    private String model = "ALL";

    @Column(name = "default_quantity", nullable = false)
    @Builder.Default
    private Integer defaultQuantity = 1;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (defaultQuantity == null) defaultQuantity = 1;
        if (brand == null) brand = "ALL";
        if (model == null) model = "ALL";
        if (createdAt == null) createdAt = Instant.now();
    }
}
