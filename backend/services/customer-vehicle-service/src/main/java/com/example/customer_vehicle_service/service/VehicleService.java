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
 * <p>Mỗi xe có đúng một chủ sở hữu hiện tại; chưa hỗ trợ đồng sở hữu.
 */
public interface VehicleService {

    /**
     * Danh sách xe có phân trang, lọc và tìm kiếm. Xe đã xoá mềm không trả về.
     *
     * @param customerId   lọc theo chủ sở hữu hiện tại. {@code null} thì không lọc.
     * @param licensePlate lọc theo biển số (so khớp chính xác, không phân biệt hoa
     *                     thường). {@code null} thì không lọc.
     * @param keyword      tìm chuỗi con trong biển số / VIN / hãng / dòng xe.
     *                     Rỗng hoặc {@code null} thì không tìm.
     * @param isActive     lọc theo trạng thái hoạt động. {@code null} thì không lọc.
     */
    PageResponse<VehicleResponse> getVehicles(UUID customerId, String licensePlate,
                                               String keyword, Boolean isActive,
                                               Pageable pageable);

    /**
     * Chi tiết một xe. Xe đã xoá mềm không trả về.
     */
    VehicleResponse getVehicleById(UUID id);

    /**
     * Tạo xe. Khách hàng phải tồn tại và còn hoạt động; VIN không được trùng với
     * bất kỳ xe nào, kể cả xe đã xoá mềm.
     */
    VehicleResponse createVehicle(VehicleCreateRequest request);

    /**
     * Cập nhật một phần: field {@code null} trong request được giữ nguyên.
     *
     * <p>Gửi {@code customerId} khác id hiện tại để chuyển chủ sở hữu, sau khi xác
     * minh khách hàng mới tồn tại và còn hoạt động.
     */
    VehicleResponse updateVehicle(UUID id, VehicleUpdateRequest request);

    /**
     * Xoá mềm. Lịch sử bảo dưỡng của xe được giữ nguyên để audit.
     */
    void deleteVehicle(UUID id);
}