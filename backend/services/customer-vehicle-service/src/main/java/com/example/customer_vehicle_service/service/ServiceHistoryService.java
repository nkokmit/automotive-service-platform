package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Nghiệp vụ lịch sử bảo dưỡng (PLAN.md bước 5).
 *
 * <p>Phạm vi cố ý hẹp: chỉ lưu bản ghi lịch sử của một xe. Không lưu chi tiết
 * hạng mục sửa chữa, phụ tùng, báo giá hay hoá đơn — những dữ liệu đó thuộc
 * work-order-service, giữ ở đây sẽ tạo hai nguồn sự thật.
 *
 * <p>Bản ghi loại {@code GARAGE_SERVICE} (sinh ra từ Work Order hoàn thành) không
 * tạo được qua service này — xem {@link #createServiceHistory}.
 */
public interface ServiceHistoryService {

    /**
     * Lịch sử bảo dưỡng của một xe, sắp xếp {@code service_date} giảm dần.
     *
     * <p>Lịch sử tra được cả khi xe đã xoá mềm, vì bảng lịch sử cố ý không có
     * soft delete và {@code VehicleServiceHistory} không dùng
     * {@code @SQLRestriction}.
     */
    PageResponse<ServiceHistoryResponse> getServiceHistory(UUID vehicleId, Pageable pageable);

    /**
     * Nhập bản ghi lịch sử từ gara bên ngoài hoặc thông tin khách hàng cung cấp.
     *
     * <p>Xe phải tồn tại và chưa bị xoá mềm. Loại bản ghi
     * {@code GARAGE_SERVICE} bị từ chối — loại đó dành cho Kafka consumer tạo từ
     * Work Order hoàn thành, và {@code workOrderId} vốn không có trong request
     * nên client không thể tự sinh bản ghi hệ thống.
     */
    ServiceHistoryResponse createServiceHistory(UUID vehicleId,
                                                ServiceHistoryCreateRequest request);
}