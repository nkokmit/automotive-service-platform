package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.VehicleCreateRequest;
import com.example.customer_vehicle_service.dto.request.VehicleUpdateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Nghiệp vụ hồ sơ xe (PLAN.md bước 4).
 *
 * <p>Cố ý KHÔNG có khái niệm chủ sở hữu: xe không gắn với khách hàng nào
 * ({@code V3__decouple_customer_from_vehicle.sql}). Khách hàng và xe gặp nhau ở
 * từng lần tiếp nhận, dữ liệu đó thuộc về lịch sử bảo dưỡng — xem
 * {@link ServiceHistoryService}.
 */
public interface VehicleService {

    /**
     * Danh sách xe có phân trang, lọc và tìm kiếm. Xe đã xoá mềm không trả về.
     *
     * <p>Cố ý không có tham số lọc theo khách hàng: muốn biết khách nào từng mang
     * xe đến thì tra {@link ServiceHistoryService#getServiceHistoryByCustomer}.
     *
     * @param licensePlate lọc theo biển số (so khớp chính xác, không phân biệt hoa
     *                     thường). {@code null} thì không lọc.
     * @param keyword      tìm chuỗi con trong biển số / VIN / hãng / dòng xe.
     *                     Rỗng hoặc {@code null} thì không tìm.
     * @param isActive     lọc theo trạng thái hoạt động. {@code null} thì không lọc.
     */
    PageResponse<VehicleResponse> getVehicles(String licensePlate,
                                               String keyword, Boolean isActive,
                                               Pageable pageable);

    /**
     * Chi tiết một xe. Xe đã xoá mềm không trả về.
     */
    VehicleResponse getVehicleById(UUID id);

    /**
     * Tạo xe. VIN không được trùng với bất kỳ xe nào, kể cả xe đã xoá mềm.
     */
    VehicleResponse createVehicle(VehicleCreateRequest request);

    /**
     * Cập nhật một phần: field {@code null} trong request được giữ nguyên.
     *
     * <p>Cố ý không có thao tác chuyển chủ sở hữu — quan hệ đó không còn tồn tại.
     */
    VehicleResponse updateVehicle(UUID id, VehicleUpdateRequest request);

    /**
     * Xoá mềm. Lịch sử bảo dưỡng của xe được giữ nguyên để audit.
     */
    void deleteVehicle(UUID id);
}