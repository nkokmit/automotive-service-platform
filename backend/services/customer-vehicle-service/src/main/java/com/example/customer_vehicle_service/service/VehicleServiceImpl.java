package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.VehicleCreateRequest;
import com.example.customer_vehicle_service.dto.request.VehicleUpdateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.exception.CustomerInactiveException;
import com.example.customer_vehicle_service.exception.CustomerNotFoundException;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.exception.VehicleVinAlreadyExistsException;
import com.example.customer_vehicle_service.mapper.VehicleMapper;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/**
 * Triển khai nghiệp vụ hồ sơ xe (PLAN.md bước 4).
 *
 * <p>Chiều ghi không dùng MapStruct: entity {@link Vehicle} có {@code @Builder} cùng
 * {@code @PrePersist}/{@code @PreUpdate} tự quản lý {@code created_at}/{@code updated_at},
 * nên gán từng field rõ ràng dễ kiểm soát hơn so với mapping hàng loạt.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final CustomerRepository customerRepository;
    private final VehicleMapper vehicleMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<VehicleResponse> getVehicles(UUID customerId, String licensePlate,
                                                      String keyword, Boolean isActive,
                                                      Pageable pageable) {
        log.debug("Tìm kiếm xe: customerId={}, licensePlate={}, keyword={}, isActive={}",
                customerId, licensePlate, keyword, isActive);

        Page<Vehicle> page = vehicleRepository.search(customerId,
                normalizeLicensePlate(licensePlate),
                normalizeKeyword(keyword),
                isActive,
                pageable);
        return PageResponse.from(page, vehicleMapper::toVehicleResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public VehicleResponse getVehicleById(UUID id) {
        // findById chịu @SQLRestriction nên xe đã xoá mềm không lấy được.
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Không tìm thấy xe với id: " + id));
        return vehicleMapper.toVehicleResponse(vehicle);
    }

    @Override
    public VehicleResponse createVehicle(VehicleCreateRequest request) {
        // Chủ sở hữu phải hợp lệ trước khi tạo xe, nếu không xe sẽ thành "mồ côi".
        Customer customer = requireActiveCustomer(request.customerId());

        String vin = normalizeVin(request.vin());
        if (vin != null) {
            requireVinAvailable(vin);
        }

        Vehicle vehicle = Vehicle.builder()
                .customer(customer)
                .licensePlate(normalizeLicensePlate(request.licensePlate()))
                .vin(vin)
                .make(request.make().trim())
                .model(request.model().trim())
                .modelYear(request.modelYear())
                .trim(request.trim())
                .color(request.color())
                .fuelType(request.fuelType())
                .transmission(request.transmission())
                .odometerKm(request.odometerKm())
                .notes(request.notes())
                // Tôn trọng trạng thái client gửi; mặc định TRUE khi bỏ qua.
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build();

        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Đã tạo xe mới cho khách hàng {}: biển số={}", customer.getId(), saved.getLicensePlate());
        return vehicleMapper.toVehicleResponse(saved);
    }

    @Override
    public VehicleResponse updateVehicle(UUID id, VehicleUpdateRequest request) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Không tìm thấy xe với id: " + id));

        // --- Chuyển chủ sở hữu ---
        // Gửi lại chính id hiện tại là thao tác không đổi: bỏ qua để không tốn query.
        if (request.customerId() != null
                && !request.customerId().equals(customerIdOf(vehicle))) {
            Customer newCustomer = requireActiveCustomer(request.customerId());
            log.info("Chuyển chủ sở hữu xe {} từ khách hàng {} sang {}",
                    id, customerIdOf(vehicle), newCustomer.getId());
            vehicle.setCustomer(newCustomer);
        }

        // --- VIN ---
        // So sánh trước với giá trị hiện tại để giữ nguyên VIN không tốn query exists.
        String vin = normalizeVin(request.vin());
        if (vin != null && !vin.equals(vehicle.getVin())) {
            requireVinAvailable(vin);
            vehicle.setVin(vin);
        }

        // --- Các field còn lại: chỉ ghi đè khi client gửi giá trị ---
        if (request.licensePlate() != null) {
            vehicle.setLicensePlate(normalizeLicensePlate(request.licensePlate()));
        }
        if (request.make() != null) {
            vehicle.setMake(request.make().trim());
        }
        if (request.model() != null) {
            vehicle.setModel(request.model().trim());
        }
        if (request.modelYear() != null) {
            vehicle.setModelYear(request.modelYear());
        }
        if (request.trim() != null) {
            vehicle.setTrim(request.trim());
        }
        if (request.color() != null) {
            vehicle.setColor(request.color());
        }
        if (request.fuelType() != null) {
            vehicle.setFuelType(request.fuelType());
        }
        if (request.transmission() != null) {
            vehicle.setTransmission(request.transmission());
        }
        if (request.odometerKm() != null) {
            vehicle.setOdometerKm(request.odometerKm());
        }
        if (request.notes() != null) {
            vehicle.setNotes(request.notes());
        }
        if (request.isActive() != null) {
            vehicle.setIsActive(request.isActive());
        }

        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Đã cập nhật xe: {}", saved.getId());
        return vehicleMapper.toVehicleResponse(saved);
    }
    @Override
    public void deleteVehicle(UUID id) {
        // Dùng native query để bypass @SQLRestriction — idempotent nếu đã xoá trước đó.
        Vehicle vehicle = vehicleRepository.findByIdRaw(id)
                .orElseThrow(() -> new VehicleNotFoundException("Không tìm thấy xe với id: " + id));

        if (vehicle.getDeletedAt() != null) {
            log.info("Xe {} đã được xoá trước đó — bỏ qua (idempotent)", id);
            return;
        }

        // Không xoá cứng: giữ lại xe và cả vehicle_service_history để tra được
        // lịch sử bảo dưỡng của xe đã ngừng lưu hành (PLAN.md bước 4).
        vehicle.setDeletedAt(Instant.now());
        vehicle.setIsActive(Boolean.FALSE);
        vehicleRepository.save(vehicle);
        log.info("Đã soft delete xe: {}", id);
    }
    // ===== Helpers =====

    /**
     * Chủ sở hữu phải tồn tại và còn hoạt động (PLAN.md bước 4: chỉ tạo xe mới hoặc
     * nhận chuyển xe cho khách hàng còn hoạt động).
     *
     * <p>Tách hai trường hợp vì chúng gợi ý hành động khác nhau: không tìm thấy là
     * nhập sai id, còn không hoạt động thì hồ sơ vẫn còn nhưng không được nhận xe.
     * Hồ sơ đã xoá mềm không tới được case thứ hai vì {@code @SQLRestriction} khiến
     * {@code findById} trả rỗng → thuộc về {@code CustomerNotFoundException}.
     */
    private Customer requireActiveCustomer(UUID customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(
                        "Không tìm thấy khách hàng với id: " + customerId));

        if (!Boolean.TRUE.equals(customer.getIsActive())) {
            throw new CustomerInactiveException(
                    "Khách hàng " + customerId + " không còn hoạt động, "
                            + "không thể tạo xe mới hoặc nhận chuyển xe");
        }
        return customer;
    }

    /**
     * Chặn VIN trùng kể cả với xe đã xoá mềm, khớp với uk_vehicles_vin.
     * Update chỉ gọi khi VIN thay đổi nên không thể trùng với chính xe đang sửa.
     */
    private void requireVinAvailable(String vin) {
        if (vehicleRepository.countByVinIncludingDeleted(vin) > 0) {
            throw new VehicleVinAlreadyExistsException(
                    "VIN đã tồn tại: " + vin
            );
        }
    }

    /**
     * Lấy {@code customerId} mà không chạm vào {@code customer.name} — quan hệ là
     * {@code LAZY} và {@code open-in-view} đang tắt nên đọc định danh thì an toàn,
     * còn đọc thuộc tính khác sẽ phát sinh query không cần thiết.
     */
    private UUID customerIdOf(Vehicle vehicle) {
        return vehicle.getCustomer() != null ? vehicle.getCustomer().getId() : null;
    }

    /**
     * Chuẩn hoá biển số: bỏ khoảng trắng thừa và đưa về chữ hoa để so khớp không
     * phân biệt hoa thường.
     *
     * <p>Cố ý không chuẩn hoá sâu hơn (bỏ dấu gạch, khoảng trắng bên trong) vì biển
     * số là mã do người dùng nhập — sửa định dạng có thể khớp sai với dữ liệu đã lưu.
     */
    private String normalizeLicensePlate(String licensePlate) {
        if (licensePlate == null || licensePlate.isBlank()) {
            return null;
        }
        return licensePlate.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Chuẩn hoá VIN: bỏ khoảng trắng thừa và đưa về chữ hoa. Chuẩn hoá trước khi so
     * khớp là cần thiết vì nếu để nguyên {@code "ABC..."} với {@code "abc..."} thì
     * check ở service có thể bỏ sót và va lỗi constraint ở DB.
     */
    private String normalizeVin(String vin) {
        if (vin == null || vin.isBlank()) {
            return null;
        }
        return vin.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Chuẩn hoá từ khoá tìm kiếm về {@code null} khi rỗng để query bỏ qua điều kiện
     * lọc thay vì so khớp {@code LIKE '%%'}.
     */
    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }
}