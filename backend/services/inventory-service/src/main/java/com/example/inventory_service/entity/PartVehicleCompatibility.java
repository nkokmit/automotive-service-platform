package com.example.inventory_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "part_vehicle_compatibilities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartVehicleCompatibility {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(name = "vehicle_brand", length = 50, nullable = false)
    private String vehicleBrand;

    @Column(name = "vehicle_model", length = 50, nullable = false)
    private String vehicleModel;

    /**
     * Năm bắt đầu tương thích. Dùng {@code Short} để khớp {@code SMALLINT}
     * trong migration — nếu dùng {@code Integer}, Hibernate validate sẽ kỳ
     * vọng {@code INT} và fail.
     */
    @Column(name = "year_from")
    private Short yearFrom;

    /**
     * Năm kết thúc tương thích ({@code NULL} = còn hiệu lực).
     */
    @Column(name = "year_to")
    private Short yearTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
