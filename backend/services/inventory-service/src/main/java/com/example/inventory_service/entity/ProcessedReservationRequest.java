package com.example.inventory_service.entity;

import com.example.inventory_service.enums.ReservationRequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
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
@Table(name = "processed_reservation_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessedReservationRequest {

    @Id
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "event_id", length = 36, updatable = false, nullable = false)
    private UUID eventId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "work_order_id", length = 36, nullable = false)
    private UUID workOrderId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estimate_id", length = 36, nullable = false)
    private UUID estimateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private ReservationRequestStatus status = ReservationRequestStatus.RESERVED;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "processed_at", nullable = false, updatable = false)
    private Instant processedAt;

    @PrePersist
    void onCreate() {
        if (processedAt == null) {
            processedAt = Instant.now();
        }
    }
}
