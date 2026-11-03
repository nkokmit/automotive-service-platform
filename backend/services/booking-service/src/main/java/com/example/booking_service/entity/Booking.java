package com.example.booking_service.entity;

import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "customer_id", length = 36, nullable = false)
    private UUID customerId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "vehicle_id", length = 36)
    private UUID vehicleId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "work_order_id", length = 36)
    private UUID workOrderId;

    @Column(name = "license_plate_snapshot", length = 20, nullable = false)
    private String licensePlateSnapshot;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private BookingStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20, nullable = false)
    @Builder.Default
    private BookingSource source = BookingSource.ONLINE;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "created_by", length = 36, updatable = false)
    private UUID createdBy;

    @Column(name = "customer_note", length = 1000)
    private String customerNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = BookingStatus.CONFIRMED;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
