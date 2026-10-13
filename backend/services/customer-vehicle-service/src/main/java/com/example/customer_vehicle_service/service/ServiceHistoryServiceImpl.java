package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.exception.ServiceHistoryInvalidTypeException;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.mapper.ServiceHistoryMapper;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import com.example.customer_vehicle_service.repository.VehicleServiceHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceHistoryServiceImpl implements ServiceHistoryService {

    private final VehicleServiceHistoryRepository historyRepository;
    private final VehicleRepository vehicleRepository;
    private final ServiceHistoryMapper historyMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ServiceHistoryResponse> getServiceHistory(UUID vehicleId,
                                                                  Pageable pageable) {
        // Vẫn kiểm tra xe tồn tại để id sai trả 2101 chứ không trả trang rỗng:
        // đây là lỗi của client, không phải kết quả "xe chưa có lịch sử".
        requireVehicle(vehicleId);

        Page<VehicleServiceHistory> page =
                historyRepository.findByVehicleId(vehicleId, pageable);
        return PageResponse.from(page, historyMapper::toServiceHistoryResponse);
    }

    @Override
    public ServiceHistoryResponse createServiceHistory(UUID vehicleId,
                                                       ServiceHistoryCreateRequest request) {
        Vehicle vehicle = requireVehicle(vehicleId);
        requireClientCreatableType(request.recordType());

        // workOrderId cố ý để null: bản ghi nhập tay không gắn Work Order.
        VehicleServiceHistory history = VehicleServiceHistory.builder()
                .vehicle(vehicle)
                .recordType(request.recordType())
                .serviceDate(request.serviceDate())
                .odometerKm(request.odometerKm())
                .summary(request.summary().trim())
                .description(request.description())
                .garageName(request.garageName())
                .build();

        VehicleServiceHistory saved = historyRepository.save(history);
        log.info("Đã thêm lịch sử bảo dưỡng {} cho xe {} ({})",
                saved.getId(), vehicleId, saved.getRecordType());
        return historyMapper.toServiceHistoryResponse(saved);
    }

    // ===== Helpers =====

    /**
     * Xe phải tồn tại và chưa bị xoá mềm. {@code findById} chịu
     * {@code @SQLRestriction} nên xe đã xoá mềm không lấy được — dù xe đó vẫn còn
     * lịch sử trong DB.
     *
     * <p>Áp dụng cả khi đọc: bản ghi lịch sử được giữ nguyên để audit, nhưng API
     * bình thường không nên trả dữ liệu của một hồ sơ đã xoá mềm trừ khi có API
     * audit riêng.
     */
    private Vehicle requireVehicle(UUID vehicleId) {
        return vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new VehicleNotFoundException(
                        "Không tìm thấy xe với id: " + vehicleId));
    }

    /**
     * Chặn client tự tạo bản ghi thuộc loại dành cho hệ thống (PLAN.md bước 5).
     *
     * <p>{@code GARAGE_SERVICE} chỉ được sinh ra từ Work Order hoàn thành qua
     * Kafka consumer ở bước 6. Cho phép client gán loại này sẽ cho phép giả
     * bản ghi dịch vụ đã thực hiện qua nền tảng mà không có Work Order nào.
     */
    private void requireClientCreatableType(ServiceRecordType recordType) {
        if (recordType == ServiceRecordType.GARAGE_SERVICE) {
            throw new ServiceHistoryInvalidTypeException(
                    "Bản ghi loại GARAGE_SERVICE do hệ thống tạo từ Work Order, "
                            + "không thể nhập thủ công");
        }
    }
}