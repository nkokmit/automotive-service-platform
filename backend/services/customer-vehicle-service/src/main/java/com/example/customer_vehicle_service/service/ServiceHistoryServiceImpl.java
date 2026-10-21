package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.exception.CustomerNotFoundException;
import com.example.customer_vehicle_service.exception.ServiceHistoryInvalidTypeException;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.mapper.ServiceHistoryMapper;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import com.example.customer_vehicle_service.repository.VehicleServiceHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Triển khai nghiệp vụ lịch sử bảo dưỡng (PLAN.md bước 5).
 *
 * <p>Đây là nơi duy nhất trong service lưu liên kết giữa khách hàng và xe: mỗi
 * bản ghi là một lần tiếp nhận và ghi lại khách hàng đã mang xe tới
 * ({@code V3__decouple_customer_from_vehicle.sql}).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceHistoryServiceImpl implements ServiceHistoryService {

    private final VehicleServiceHistoryRepository historyRepository;
    private final VehicleRepository vehicleRepository;
    private final CustomerRepository customerRepository;
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
        requireVehicle(vehicleId);

        // Lịch sử kỹ thuật của xe là dữ liệu vận hành của gara, chỉ nhân viên
        // được xem. Khách hàng đọc lịch sử của chính mình qua
        // getServiceHistoryByCustomer — nhưng chỉ thấy đúng những lần MÌNH mang
        // xe đến, không phải toàn bộ lịch sử của mọi xe.
        requireCallerIsNotCustomer();

        Page<VehicleServiceHistory> page =
                historyRepository.findByVehicleId(vehicleId, pageable);
        return PageResponse.from(page, historyMapper::toServiceHistoryResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ServiceHistoryResponse> getServiceHistoryByCustomer(UUID customerId,
                                                                             Pageable pageable) {
        log.debug("Đọc lịch sử theo khách hàng: customerId={}", customerId);

        Page<VehicleServiceHistory> page =
                historyRepository.findByCustomerIdOrderByServiceDateDesc(customerId, pageable);
        return PageResponse.from(page, historyMapper::toServiceHistoryResponse);
    }

    @Override
    public ServiceHistoryResponse createServiceHistory(UUID vehicleId,
                                                       ServiceHistoryCreateRequest request) {
        Vehicle vehicle = requireVehicle(vehicleId);
        requireClientCreatableType(request.recordType());

        // Khách hàng tuỳ chọn: bỏ trống thì bản ghi không gắn với ai (xe gửi hộ,
        // nhập hậu kỳ từ hồ sơ giấy). Nếu có gửi thì phải tồn tại, vì cột này
        // là khóa ngoại tới customers.id.
        //
        // Cố ý KHÔNG chặn is_active = FALSE: trạng thái đó là "tạm ngừng sử
        // dụng, xe đang gửi bảo dưỡng" — khách vẫn mang xe tới gara và ta vẫn
        // phải ghi được lần tiếp nhận đó. Chỉ khách đã xoá mềm mới không ghi được,
        // và @SQLRestriction của Customer đã khiến findById trả rỗng → 2001.
        UUID customerId = request.customerId() == null
                ? null
                : requireExistingCustomer(request.customerId()).getId();

        // workOrderId cố ý để null: bản ghi nhập tay không gắn Work Order.
        VehicleServiceHistory history = VehicleServiceHistory.builder()
                .vehicle(vehicle)
                .customerId(customerId)
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
     * Chặn khách hàng đọc lịch sử kỹ thuật theo xe.
     *
     * <p>Sau khi bỏ quan hệ sở hữu, {@code /api/vehicles/{id}/service-history}
     * không còn câu hỏi "xe này của ai" nữa — và đó chính là lý do phải chặn:
     * nếu vẫn mở cho CUSTOMER thì bất kỳ khách nào đăng nhập cũng đọc được
     * toàn bộ lịch sử của mọi xe trong hệ thống chỉ bằng cách đoán id. Khách
     * hàng xem lịch sử của chính mình qua {@code /api/service-history/me}.
     *
     * <p>Kiểm tra theo authority chứ không theo {@code customerId} trong dữ liệu:
     * lịch sử vốn không gắn với ai, nên chỉ cần biết "caller có phải khách
     * hàng không". Nhân viên đã bị {@code @PreAuthorize} của controller kiểm tra
     * quyền {@code SERVICE_HISTORY_READ} trước khi tới đây.
     *
     * <p>Ném {@link AccessDeniedException} (403) chứ không phải 404: đây không còn
     * là existence oracle nữa — id xe và việc xe tồn tại là công khai với nhân
     * viên, còn câu hỏi duy nhất là "bạn có phải nhân viên không".
     */
    private void requireCallerIsNotCustomer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isCustomer = authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> CUSTOMER_AUTHORITY.equals(authority.getAuthority()));

        if (isCustomer) {
            log.warn("Từ chối khách hàng {} đọc lịch sử kỹ thuật của xe — "
                            + "dùng GET /api/service-history/me để xem lịch sử của chính mình",
                    authentication.getName());
            throw new AccessDeniedException("Bạn không có quyền xem lịch sử bảo dưỡng của xe");
        }
    }

    /**
     * Khách hàng phải tồn tại và chưa bị xoá mềm.
     *
     * <p>Cố ý không kiểm tra {@code isActive}: xem giải thích ở
     * {@link #createServiceHistory}.
     */
    private Customer requireExistingCustomer(UUID customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(
                        "Không tìm thấy khách hàng với id: " + customerId));
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