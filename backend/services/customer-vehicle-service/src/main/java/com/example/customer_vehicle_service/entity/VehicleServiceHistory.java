package com.example.customer_vehicle_service.entity;

import com.example.customer_vehicle_service.enums.ServiceRecordType;
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

/**
 * Entity đại diện cho một bản ghi lịch sử bảo dưỡng của xe.
 *
 * <p>Bản ghi đến từ hai nguồn: nhập bởi nhân viên (gara bên ngoài / thông tin
 * khách hàng cung cấp) hoặc tự động tạo khi nhận sự kiện Work Order hoàn
 * thành — nguồn được phân biệt bằng {@link ServiceRecordType}.
 *
 * <p>{@code workOrderId} là ID ở {@code work-order-service}: cross-service nên
 * chỉ lưu ID dạng {@link UUID}, không có JPA relationship hay foreign key
 * (GLOBAL_RULES §2).
 *
 * <p>Bảng này cố ý KHÔNG có soft delete: giữ nguyên dòng lịch sử để audit,
 * kể cả khi xe hoặc khách hàng đã bị xoá mềm.
 */
@Entity
@Table(name = "vehicle_service_histories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VehicleServiceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    /**
     * Quan hệ nội bộ: xe được bảo dưỡng. Không dùng {@code @SQLRestriction} vì
     * lịch sử phải tra được cả khi xe đã xoá mềm.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    /**
     * ID Work Order sinh ra bản ghi này. NULL với bản ghi nhập từ bên ngoài.
     * Unique ở DB để xử lý idempotency khi event bị gửi lại. Cột là
     * {@code VARCHAR(36)} nên phải khai báo {@code @JdbcTypeCode} — nếu không
     * Hibernate 7 sẽ mặc định map UUID thành {@code binary(36)} và validate fail.
     */
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "work_order_id", length = 36)
    private UUID workOrderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", length = 30, nullable = false)
    private ServiceRecordType recordType;

    /**
     * Ngày thực hiện dịch vụ, hoặc ngày ghi nhận với bản ghi do khách hàng
     * cung cấp.
     */
    @Column(name = "service_date", nullable = false)
    private Instant serviceDate;

    /**
     * Số km của xe tại thời điểm dịch vụ.
     */
    @Column(name = "odometer_km")
    private Integer odometerKm;

    @Column(name = "summary", length = 255, nullable = false)
    private String summary;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Tên gara thực hiện, đặc biệt hữu ích với bản ghi lịch sử bên ngoài.
     */
    @Column(name = "garage_name", length = 150)
    private String garageName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}