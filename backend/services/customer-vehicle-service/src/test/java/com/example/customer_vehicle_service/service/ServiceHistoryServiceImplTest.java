package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** Unit test nghiệp vụ lịch sử bảo dưỡng, không cần MySQL/Flyway. */
@ExtendWith(MockitoExtension.class)
class ServiceHistoryServiceImplTest {

    @Mock
    private VehicleServiceHistoryRepository historyRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private ServiceHistoryMapper historyMapper;
    @Mock
    private CurrentCustomerService currentCustomerService;
    @InjectMocks
    private ServiceHistoryServiceImpl serviceHistoryService;

    private static final UUID VEHICLE_ID = UUID.randomUUID();
    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final Instant SERVICE_DATE = Instant.parse("2026-01-15T08:30:00Z");

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ===== Đọc lịch sử =====

    @Test
    void getServiceHistory_delegatesWithGivenPageableAndMapsPage() {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        var entity = history(ServiceRecordType.EXTERNAL_SERVICE);
        given(historyRepository.findByVehicleId(VEHICLE_ID, pageable))
                .willReturn(new PageImpl<>(List.of(entity), pageable, 1));
        ServiceHistoryResponse mapped = response(null);
        given(historyMapper.toServiceHistoryResponse(entity)).willReturn(mapped);

        var result = serviceHistoryService.getServiceHistory(VEHICLE_ID, pageable);

        assertThat(result.items()).containsExactly(mapped);
        assertThat(result.totalElements()).isEqualTo(1);
        verify(historyRepository).findByVehicleId(VEHICLE_ID, pageable);
    }

    @Test
    void getServiceHistory_throwsWhenVehicleNotFound() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> serviceHistoryService.getServiceHistory(VEHICLE_ID, PageRequest.of(0, 20)))
                .isInstanceOf(VehicleNotFoundException.class);

        // Không query lịch sử khi xe không tồn tại — trả 2101 thay vì trang rỗng.
        verifyNoInteractions(historyRepository);
    }

    // ===== Tạo lịch sử =====

    @Test
    void createServiceHistory_persistsFieldsAndLeavesWorkOrderIdNull() {
        Vehicle vehicle = vehicle();
        ServiceHistoryResponse mapped = response(null);
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(historyRepository.save(any(VehicleServiceHistory.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(historyMapper.toServiceHistoryResponse(any(VehicleServiceHistory.class)))
                .willReturn(mapped);

        var result = serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(null, ServiceRecordType.EXTERNAL_SERVICE, "  Thay dầu  ", "Gara An Phú"));

        assertThat(result).isEqualTo(mapped);
        ArgumentCaptor<VehicleServiceHistory> captor =
                ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        VehicleServiceHistory saved = captor.getValue();
        assertThat(saved.getVehicle()).isSameAs(vehicle);
        assertThat(saved.getRecordType()).isEqualTo(ServiceRecordType.EXTERNAL_SERVICE);
        assertThat(saved.getServiceDate()).isEqualTo(SERVICE_DATE);
        assertThat(saved.getOdometerKm()).isEqualTo(15000);
        // summary được trim vì @NotBlank cho phép khoảng trắng thừa quanh chuỗi.
        assertThat(saved.getSummary()).isEqualTo("Thay dầu");
        assertThat(saved.getDescription()).isEqualTo("Thay dầu và lọc gió");
        assertThat(saved.getGarageName()).isEqualTo("Gara An Phú");
        // Bản ghi nhập tay không gắn Work Order: không có nguồn để suy ra.
        assertThat(saved.getWorkOrderId()).isNull();
    }

    @Test
    void createServiceHistory_rejectsSystemRecordType() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));

        assertThatThrownBy(() -> serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(null, ServiceRecordType.GARAGE_SERVICE, "Thay dầu", null)))
                .isInstanceOf(ServiceHistoryInvalidTypeException.class)
                .hasMessageContaining("GARAGE_SERVICE");

        // Bản ghi hệ thống chỉ tạo được từ Work Order, không lưu khi bị từ chối.
        verify(historyRepository, never()).save(any(VehicleServiceHistory.class));
    }

    @Test
    void createServiceHistory_allowsCustomerReportedWithoutGarage() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(historyRepository.save(any(VehicleServiceHistory.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(historyMapper.toServiceHistoryResponse(any(VehicleServiceHistory.class)))
                .willReturn(response(null));

        serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(null, ServiceRecordType.CUSTOMER_REPORTED, "Khách nói vừa thay phanh", null));

        ArgumentCaptor<VehicleServiceHistory> captor =
                ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        assertThat(captor.getValue().getGarageName()).isNull();
    }

    @Test
    void createServiceHistory_throwsWhenVehicleNotFound() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(null, ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu", null)))
                .isInstanceOf(VehicleNotFoundException.class);

        verifyNoInteractions(historyRepository);
    }

    // ===== Chặn khách hàng đọc lịch sử kỹ thuật của xe =====

    /**
     * Đảo ngược hoàn toàn mô hình cũ: trước đây khách hàng đọc được lịch sử của
     * "xe mình sở hữu". Nay xe không thuộc về ai, và nếu vẫn mở thì bất kỳ khách
     * nào đăng nhập cũng đọc được lịch sử của mọi xe trong hệ thống chỉ bằng cách
     * đoán id.
     */
    @Test
    void getServiceHistory_rejectsCustomer() {
        authenticateAsCustomer();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));

        assertThatThrownBy(() -> serviceHistoryService.getServiceHistory(VEHICLE_ID, PageRequest.of(0, 20)))
                .isInstanceOf(AccessDeniedException.class);

        verify(historyRepository, never()).findByVehicleId(any(), any());
    }

    @Test
    void getServiceHistory_staffReadsAnyVehicleHistory() {
        authenticateAs("SERVICE_HISTORY_READ");
        var pageable = PageRequest.of(0, 20);
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(historyRepository.findByVehicleId(VEHICLE_ID, pageable))
                .willReturn(new PageImpl<>(List.of(), pageable, 0));

        serviceHistoryService.getServiceHistory(VEHICLE_ID, pageable);

        verify(historyRepository).findByVehicleId(VEHICLE_ID, pageable);
        // Nhân viên không cần resolve hồ sơ khách hàng của chính mình.
        verifyNoInteractions(currentCustomerService);
    }

    /** Không có authentication (vd. gọi nội bộ) thì không ai bị coi là khách hàng. */
    @Test
    void getServiceHistory_withoutAuthenticationIsTreatedAsStaff() {
        var pageable = PageRequest.of(0, 20);
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(historyRepository.findByVehicleId(VEHICLE_ID, pageable))
                .willReturn(new PageImpl<>(List.of(), pageable, 0));

        serviceHistoryService.getServiceHistory(VEHICLE_ID, pageable);

        verifyNoInteractions(currentCustomerService);
    }

    // ===== Đọc lịch sử theo khách hàng =====

    /**
     * Bất biến bảo mật cốt lõi (spec §6): khách A và khách B cùng mang một xe tới,
     * mỗi người chỉ thấy lần của chính mình.
     *
     * <p>Test khoá hành vi ở tầng service: truy vấn lọc theo {@code customerId}
     * được truyền vào, không lọc theo xe. Vì vậy kể cả khi hai khách dùng chung một
     * {@code vehicleId}, hai lần gọi vẫn trả về hai tập bản ghi khác nhau.
     */
    @Test
    void getServiceHistoryByCustomer_neverLeaksAnotherCustomersVisit() {
        UUID customerA = UUID.randomUUID();
        UUID customerB = UUID.randomUUID();
        var pageable = PageRequest.of(0, 20);

        // Cùng một xe, hai khách mang tới ở hai thời điểm khác nhau.
        VehicleServiceHistory visitByA = history(customerA, ServiceRecordType.EXTERNAL_SERVICE);
        VehicleServiceHistory visitByB = history(customerB, ServiceRecordType.EXTERNAL_SERVICE);
        given(historyRepository.findByCustomerIdOrderByServiceDateDesc(customerA, pageable))
                .willReturn(new PageImpl<>(List.of(visitByA), pageable, 1));
        given(historyRepository.findByCustomerIdOrderByServiceDateDesc(customerB, pageable))
                .willReturn(new PageImpl<>(List.of(visitByB), pageable, 1));
        ServiceHistoryResponse responseA = response(customerA);
        ServiceHistoryResponse responseB = response(customerB);
        given(historyMapper.toServiceHistoryResponse(visitByA)).willReturn(responseA);
        given(historyMapper.toServiceHistoryResponse(visitByB)).willReturn(responseB);

        var resultA = serviceHistoryService.getServiceHistoryByCustomer(customerA, pageable);
        var resultB = serviceHistoryService.getServiceHistoryByCustomer(customerB, pageable);

        assertThat(resultA.items()).containsExactly(responseA);
        assertThat(resultA.items()).noneMatch(item -> customerB.equals(item.customerId()));
        assertThat(resultB.items()).containsExactly(responseB);
        assertThat(resultB.items()).noneMatch(item -> customerA.equals(item.customerId()));
    }

    /**
     * {@code getServiceHistoryByCustomer} không cần resolve hồ sơ khách hàng: id
     * đã do {@code CurrentCustomerService} lấy từ token và truyền vào. Truy vấn
     * theo id thuần nên cũng không chạm tới {@code CustomerRepository}.
     */
    @Test
    void getServiceHistoryByCustomer_doesNotRequireAuthenticationContext() {
        UUID customerId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 20);
        given(historyRepository.findByCustomerIdOrderByServiceDateDesc(customerId, pageable))
                .willReturn(new PageImpl<>(List.of(), pageable, 0));

        serviceHistoryService.getServiceHistoryByCustomer(customerId, pageable);

        verifyNoInteractions(currentCustomerService, customerRepository, vehicleRepository);
    }

    // ===== Gắn khách hàng vào lần tiếp nhận =====

    @Test
    void createServiceHistory_linksTheCustomerWhoBroughtTheVehicle() {
        UUID customerId = UUID.randomUUID();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(customerRepository.findById(customerId)).willReturn(Optional.of(customer(customerId, true)));
        given(historyRepository.save(any(VehicleServiceHistory.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(historyMapper.toServiceHistoryResponse(any(VehicleServiceHistory.class)))
                .willReturn(response(customerId));

        serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(customerId, ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu", "Gara An Phú"));

        ArgumentCaptor<VehicleServiceHistory> captor =
                ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        assertThat(captor.getValue().getCustomerId()).isEqualTo(customerId);
    }

    /** Không rõ ai mang xe tới (xe gửi hộ, nhập hậu kỳ) thì để null, không bắt buộc. */
    @Test
    void createServiceHistory_allowsMissingCustomer() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(historyRepository.save(any(VehicleServiceHistory.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(historyMapper.toServiceHistoryResponse(any(VehicleServiceHistory.class)))
                .willReturn(response(null));

        serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(null, ServiceRecordType.CUSTOMER_REPORTED, "Khách nói vừa thay phanh", null));

        ArgumentCaptor<VehicleServiceHistory> captor =
                ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        assertThat(captor.getValue().getCustomerId()).isNull();
        verifyNoInteractions(customerRepository);
    }

    /**
     * Khách hàng không còn hoạt động vẫn gửi xe bảo dưỡng được — {@code isActive =
     * FALSE} chính là "đang gửi xe đi bảo dưỡng", nên chặn ở đây sẽ loại đúng người
     * ta muốn phục vụ.
     */
    @Test
    void createServiceHistory_allowsInactiveCustomer() {
        UUID customerId = UUID.randomUUID();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(customerRepository.findById(customerId))
                .willReturn(Optional.of(customer(customerId, false)));
        given(historyRepository.save(any(VehicleServiceHistory.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(historyMapper.toServiceHistoryResponse(any(VehicleServiceHistory.class)))
                .willReturn(response(customerId));

        serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(customerId, ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu", null));

        ArgumentCaptor<VehicleServiceHistory> captor =
                ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        assertThat(captor.getValue().getCustomerId()).isEqualTo(customerId);
    }

    @Test
    void createServiceHistory_rejectsUnknownCustomer() {
        UUID customerId = UUID.randomUUID();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        given(customerRepository.findById(customerId)).willReturn(Optional.empty());

        assertThatThrownBy(() -> serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(customerId, ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu", null)))
                .isInstanceOf(CustomerNotFoundException.class);

        verify(historyRepository, never()).save(any(VehicleServiceHistory.class));
    }

    // ===== Helpers =====

    private void authenticateAsCustomer() {
        authenticateAs("ROLE_CUSTOMER");
    }

    private void authenticateAs(String authority) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("tester", null,
                        List.of(new SimpleGrantedAuthority(authority))));
    }

    private Customer customer(UUID id, boolean active) {
        return Customer.builder().id(id).isActive(active).build();
    }

    private Vehicle vehicle() {
        return Vehicle.builder().id(VEHICLE_ID)
                .licensePlate("30A-12345").make("Honda").model("Accord").build();
    }

    private VehicleServiceHistory history(ServiceRecordType type) {
        return history(UUID.randomUUID(), type);
    }

    private VehicleServiceHistory history(UUID customerId, ServiceRecordType type) {
        return VehicleServiceHistory.builder().id(UUID.randomUUID())
                .vehicle(vehicle()).customerId(customerId).recordType(type)
                .serviceDate(SERVICE_DATE).summary("Thay dầu").build();
    }

    private ServiceHistoryCreateRequest request(UUID customerId, ServiceRecordType type,
                                               String summary, String garageName) {
        return new ServiceHistoryCreateRequest(customerId, type, SERVICE_DATE, 15000, summary,
                "Thay dầu và lọc gió", garageName);
    }

    private ServiceHistoryResponse response(UUID customerId) {
        return new ServiceHistoryResponse(UUID.randomUUID(), VEHICLE_ID, customerId, null,
                ServiceRecordType.EXTERNAL_SERVICE, SERVICE_DATE, 15000, "Thay dầu",
                "Thay dầu và lọc gió", "Gara An Phú", SERVICE_DATE);
    }
}