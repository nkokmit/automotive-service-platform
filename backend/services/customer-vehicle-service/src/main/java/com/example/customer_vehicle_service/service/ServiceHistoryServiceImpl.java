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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final CurrentCustomerService currentCustomerService;

    /**
     * Authority của role khách hàng: người chỉ được xem dữ liệu của chính mình.
     * Các authority còn lại (quyền của ADMIN / MANAGER / MECHANIC) là nhân viên,
     * xem được toàn bộ.
     *
     * <p>Tiền tố {@code ROLE_} đúng theo cách {@code User#getAuthorities} dựng
     * authority cho từng role của user-service.
     *
     * <p>Đây là điều kiện ở tầng service, tách khỏi {@code @PreAuthorize} của
     * controller vì controller không biết xe nào thuộc về ai — quyết định đó
     * cần đọc dữ liệu.
     */
    private static final String CUSTOMER_AUTHORITY = "ROLE_CUSTOMER";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ServiceHistoryResponse> getServiceHistory(UUID vehicleId,
                                                                  Pageable pageable) {
        // Vẫn kiểm tra xe tồn tại để id sai trả 2101 chứ không trả trang rỗng:
        // đây là lỗi của client, không phải kết quả "xe chưa có lịch sử".
        Vehicle vehicle = requireVehicle(vehicleId);
        requireCallerMayReadHistory(vehicle);

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
     * Khách hàng chỉ đọc được lịch sử của xe mình sở hữu; nhân viên đọc được tất
     * cả.
     *
     * <p>Cố ý ném {@link VehicleNotFoundException} (404) chứ không phải 403 khi
     * xe không thuộc về caller: trả 403 cho id tồn tại sẽ tạo đường dòm xem
     * id nào là thật, tức là một existence oracle. Cùng một lỗi 404 cho cả
     * "không có xe" lẫn "không phải xe của bạn" thì client không phân biệt
     * được, cũng chính là điều ta muốn.
     *
     * <p>Chỉ đọc {@code vehicle.getCustomer().getId()}: {@code Vehicle.customer}
     * là {@code LAZY} và {@code open-in-view} đang tắt, nên đọc thêm thuộc
     * tính khác của customer sẽ ném {@code LazyInitializationException}.
     */
    private void requireCallerMayReadHistory(Vehicle vehicle) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isCustomer = authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> CUSTOMER_AUTHORITY.equals(authority.getAuthority()));

        if (!isCustomer) {
            // Nhân viên: đã bị @PreAuthorize của controller kiểm tra quyền đọc.
            return;
        }

        UUID callerCustomerId = currentCustomerService.getRequiredCustomerId();
        UUID ownerCustomerId = vehicle.getCustomer().getId();

        if (!callerCustomerId.equals(ownerCustomerId)) {
            log.warn("Khách hàng {} {} thử xem lịch sử của xe {} thuộc về khách hàng {}",
                    callerCustomerId, authentication.getName(), vehicle.getId(), ownerCustomerId);
            throw new VehicleNotFoundException("Không tìm thấy xe với id: " + vehicle.getId());
        }
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