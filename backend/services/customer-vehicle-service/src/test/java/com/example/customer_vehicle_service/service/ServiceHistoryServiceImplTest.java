package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.exception.ServiceHistoryInvalidTypeException;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.mapper.ServiceHistoryMapper;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import com.example.customer_vehicle_service.repository.VehicleServiceHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

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
    private ServiceHistoryMapper historyMapper;
    @InjectMocks
    private ServiceHistoryServiceImpl serviceHistoryService;

    private static final UUID VEHICLE_ID = UUID.randomUUID();
    private static final Instant SERVICE_DATE = Instant.parse("2026-01-15T08:30:00Z");

    // ===== Đọc lịch sử =====

    @Test
    void getServiceHistory_delegatesWithGivenPageableAndMapsPage() {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "serviceDate"));
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle()));
        var entity = history(ServiceRecordType.EXTERNAL_SERVICE);
        given(historyRepository.findByVehicleId(VEHICLE_ID, pageable))
                .willReturn(new PageImpl<>(List.of(entity), pageable, 1));
        ServiceHistoryResponse mapped = response();
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
        ServiceHistoryResponse mapped = response();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(historyRepository.save(any(VehicleServiceHistory.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(historyMapper.toServiceHistoryResponse(any(VehicleServiceHistory.class)))
                .willReturn(mapped);

        var result = serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(ServiceRecordType.EXTERNAL_SERVICE, "  Thay dầu  ", "Gara An Phú"));

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
                request(ServiceRecordType.GARAGE_SERVICE, "Thay dầu", null)))
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
                .willReturn(response());

        serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(ServiceRecordType.CUSTOMER_REPORTED, "Khách nói vừa thay phanh", null));

        ArgumentCaptor<VehicleServiceHistory> captor =
                ArgumentCaptor.forClass(VehicleServiceHistory.class);
        verify(historyRepository).save(captor.capture());
        assertThat(captor.getValue().getGarageName()).isNull();
    }

    @Test
    void createServiceHistory_throwsWhenVehicleNotFound() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> serviceHistoryService.createServiceHistory(VEHICLE_ID,
                request(ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu", null)))
                .isInstanceOf(VehicleNotFoundException.class);

        verifyNoInteractions(historyRepository);
    }

    // ===== Helpers =====

    private Vehicle vehicle() {
        return Vehicle.builder().id(VEHICLE_ID)
                .customer(Customer.builder().id(UUID.randomUUID()).build())
                .licensePlate("30A-12345").make("Honda").model("Accord").build();
    }

    private VehicleServiceHistory history(ServiceRecordType type) {
        return VehicleServiceHistory.builder().id(UUID.randomUUID())
                .vehicle(vehicle()).recordType(type).serviceDate(SERVICE_DATE)
                .summary("Thay dầu").build();
    }

    private ServiceHistoryCreateRequest request(ServiceRecordType type, String summary,
                                               String garageName) {
        return new ServiceHistoryCreateRequest(type, SERVICE_DATE, 15000, summary,
                "Thay dầu và lọc gió", garageName);
    }

    private ServiceHistoryResponse response() {
        return new ServiceHistoryResponse(UUID.randomUUID(), VEHICLE_ID, null,
                ServiceRecordType.EXTERNAL_SERVICE, SERVICE_DATE, 15000, "Thay dầu",
                "Thay dầu và lọc gió", "Gara An Phú", SERVICE_DATE);
    }
}