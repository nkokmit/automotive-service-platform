package com.example.customer_vehicle_service.repository;

import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleServiceHistoryRepository
        extends JpaRepository<VehicleServiceHistory, UUID> {

    /**
     * Phân trang lịch sử bảo dưỡng của một xe, sắp xếp theo
     * {@code service_date} giảm dần (truy vấn mới nhất trước).
     *
     * <p>Không dùng {@code @SQLRestriction}: lịch sử phải tra được cả khi xe
     * đã bị xoá mềm.
     */
    Page<VehicleServiceHistory> findByVehicleId(UUID vehicleId, Pageable pageable);

    /**
     * Phân trang lịch sử của những lần MỘT khách hàng đã mang xe đến, sắp xếp
     * theo {@code service_date} giảm dần.
     *
     * <p>Đây là truy vấn phục vụ {@code GET /api/service-history/me} — phạm vi
     * đọc duy nhất còn lại của khách hàng sau khi bỏ quan hệ sở hữu. Chỉ trả
     * dòng có {@code customer_id} đúng bằng caller, nên một lần mang xe của
     * khách này tới xe của người khác hiện trong lịch sử của người kia vẫn vô
     * hình — đúng như tinh thần
     * {@code CUSTOMER_VEHICLE_RELATIONSHIP_CONTEXT.md} §6.
     *
     * <p>Không dùng {@code @SQLRestriction}: lịch sử phải tra được cả khi xe
     * hoặc khách hàng đã bị xoá mềm.
     */
    Page<VehicleServiceHistory> findByCustomerIdOrderByServiceDateDesc(UUID customerId,
                                                                      Pageable pageable);

    /**
     * Kiểm tra đã có lịch sử cho Work Order này chưa — dùng chống tạo trùng khi
     * event Work Order hoàn thành được gửi lại.
     */
    boolean existsByWorkOrderId(UUID workOrderId);
}