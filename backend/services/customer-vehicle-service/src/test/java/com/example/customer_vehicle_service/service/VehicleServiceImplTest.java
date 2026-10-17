package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.VehicleCreateRequest;
import com.example.customer_vehicle_service.dto.request.VehicleUpdateRequest;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.exception.ErrorCode;
import com.example.customer_vehicle_service.exception.VehicleNotFoundException;
import com.example.customer_vehicle_service.exception.VehicleVinAlreadyExistsException;
import com.example.customer_vehicle_service.mapper.VehicleMapper;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Unit test nghiệp vụ xe, không cần MySQL/Flyway.
 *
 * <p>Cố ý KHÔNG mock {@code CustomerRepository}: {@link VehicleServiceImpl}
 * không còn phụ thuộc khách hàng nào nữa. Nếu sau này ai đó thêm lại, Mockito sẽ
 * inject {@code null} và test này ném {@code NullPointerException} ngay — đó là
 * cách rẻ nhất để phát hiện quan hệ cũ quay lại.
 */
@ExtendWith(MockitoExtension.class)
class VehicleServiceImplTest {

    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private VehicleMapper vehicleMapper;
    @InjectMocks
    private VehicleServiceImpl vehicleService;

    private static final UUID VEHICLE_ID = UUID.randomUUID();
    private static final String VIN = "1HGCM82633A004352";
    private static final String NEW_VIN = "1HGCM82633A004353";

    @Test
    void createVehicle_persistsFieldsAndDefaultsToActive() {
        given(vehicleRepository.save(any(Vehicle.class))).willAnswer(invocation -> invocation.getArgument(0));
        VehicleResponse expected = response(vehicle());
        given(vehicleMapper.toVehicleResponse(any(Vehicle.class))).willReturn(expected);

        var result = vehicleService.createVehicle(createRequest(VIN.toLowerCase(Locale.ROOT), null));

        assertThat(result).isEqualTo(expected);
        ArgumentCaptor<Vehicle> captor = ArgumentCaptor.forClass(Vehicle.class);
        verify(vehicleRepository).save(captor.capture());
        Vehicle saved = captor.getValue();
        assertThat(saved.getLicensePlate()).isEqualTo("30A-12345");
        assertThat(saved.getVin()).isEqualTo(VIN);
        assertThat(saved.getMake()).isEqualTo("Honda");
        assertThat(saved.getModel()).isEqualTo("Accord");
        assertThat(saved.getModelYear()).isEqualTo((short) 2020);
        assertThat(saved.getTrim()).isEqualTo("EX");
        assertThat(saved.getColor()).isEqualTo("Black");
        assertThat(saved.getFuelType()).isEqualTo("Petrol");
        assertThat(saved.getTransmission()).isEqualTo("Automatic");
        assertThat(saved.getOdometerKm()).isEqualTo(15000);
        assertThat(saved.getNotes()).isEqualTo("ghi chú");
        assertThat(saved.getIsActive()).isTrue();
        assertThat(saved.getDeletedAt()).isNull();
        verify(vehicleRepository).countByVinIncludingDeleted(VIN);
    }

    /**
     * Xe không thuộc về khách hàng nào, nên không có đường nào để gắn owner khi
     * tạo. Nếu ai đó thêm lại {@code .customer(...)} vào builder, phần schema thì
     * do V3 migration lo — test này chỉ chứng minh "không còn truy cập khách
     * hàng".
     */
    @Test
    void createVehicle_needsNoOwner() {
        given(vehicleRepository.save(any(Vehicle.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(vehicleMapper.toVehicleResponse(any(Vehicle.class))).willReturn(response(vehicle()));

        vehicleService.createVehicle(createRequest(VIN, null));

        verify(vehicleRepository).save(any(Vehicle.class));
    }

    @Test
    void createVehicle_allowsMissingVinAndExplicitInactiveStatus() {
        given(vehicleRepository.save(any(Vehicle.class))).willAnswer(invocation -> invocation.getArgument(0));

        vehicleService.createVehicle(createRequest(null, false));

        ArgumentCaptor<Vehicle> captor = ArgumentCaptor.forClass(Vehicle.class);
        verify(vehicleRepository).save(captor.capture());
        assertThat(captor.getValue().getVin()).isNull();
        assertThat(captor.getValue().getIsActive()).isFalse();
        verify(vehicleRepository, never()).countByVinIncludingDeleted(any());
    }

    /**
     * Ràng buộc cốt lõi của đợt tách chủ sở hữu: tạo xe không được yêu cầu khách
     * hàng. Cả hai test cũ (khách chưa tồn tại / khách không hoạt động) đều bị
     * gỡ vì không còn tình huống nào để chặn.
     */
    @Test
    void createVehicle_rejectsVinReservedByAnyVehicleIncludingDeleted() {
        given(vehicleRepository.countByVinIncludingDeleted(VIN)).willReturn(1L);

        assertThatThrownBy(() -> vehicleService.createVehicle(createRequest(VIN, null)))
                .isInstanceOf(VehicleVinAlreadyExistsException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VEHICLE_VIN_EXISTS);
        verify(vehicleRepository, never()).save(any());
    }

    /**
     * Không còn chuyển chủ sở hữu nữa, nên cũng không còn nhánh gọi tới
     * CustomerRepository. Test khoá hành vi: cập nhật xe không bao giờ chạm tới
     * khách hàng — và vì {@code VehicleUpdateRequest} không còn có
     * {@code customerId}, client cũ gửi field đó cũng bị Jackson bỏ qua chứ
     * không tạo được đường nâng quyền.
     */
    @Test
    void updateVehicle_hasNoOwnershipTransferPath() {
        Vehicle vehicle = vehicle();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(vehicleRepository.save(vehicle)).willReturn(vehicle);
        given(vehicleMapper.toVehicleResponse(vehicle)).willAnswer(invocation -> response(vehicle));

        vehicleService.updateVehicle(VEHICLE_ID, updateRequest(null));

        assertThat(vehicle.getIsActive()).isTrue();
        verify(vehicleRepository).save(vehicle);
    }

    @Test
    void updateVehicle_rejectsDuplicateChangedVinIncludingDeletedVehicles() {
        Vehicle vehicle = vehicle();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(vehicleRepository.countByVinIncludingDeleted(NEW_VIN)).willReturn(1L);

        assertThatThrownBy(() -> vehicleService.updateVehicle(VEHICLE_ID, updateRequest(NEW_VIN)))
                .isInstanceOf(VehicleVinAlreadyExistsException.class);
        assertThat(vehicle.getVin()).isEqualTo(VIN);
        verify(vehicleRepository, never()).save(any());
    }

    @Test
    void updateVehicle_updatesSuppliedFields() {
        Vehicle vehicle = vehicle();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(vehicleRepository.save(vehicle)).willReturn(vehicle);
        var request = new VehicleUpdateRequest(" 30b-54321 ", NEW_VIN.toLowerCase(Locale.ROOT),
                " Toyota ", " Camry ", (short) 2024, "LE", "White", "Hybrid", "CVT", 0,
                "updated", false);

        vehicleService.updateVehicle(VEHICLE_ID, request);

        assertThat(vehicle.getLicensePlate()).isEqualTo("30B-54321");
        assertThat(vehicle.getVin()).isEqualTo(NEW_VIN);
        assertThat(vehicle.getMake()).isEqualTo("Toyota");
        assertThat(vehicle.getModel()).isEqualTo("Camry");
        assertThat(vehicle.getModelYear()).isEqualTo((short) 2024);
        assertThat(vehicle.getTrim()).isEqualTo("LE");
        assertThat(vehicle.getColor()).isEqualTo("White");
        assertThat(vehicle.getFuelType()).isEqualTo("Hybrid");
        assertThat(vehicle.getTransmission()).isEqualTo("CVT");
        assertThat(vehicle.getOdometerKm()).isZero();
        assertThat(vehicle.getNotes()).isEqualTo("updated");
        assertThat(vehicle.getIsActive()).isFalse();
        verify(vehicleRepository).countByVinIncludingDeleted(NEW_VIN);
    }

    @Test
    void updateVehicle_preservesOmittedFields() {
        Vehicle vehicle = vehicle();
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(vehicleRepository.save(vehicle)).willReturn(vehicle);
        var request = new VehicleUpdateRequest(null, null, null, null, null, null,
                "White", null, null, null, null, null);

        vehicleService.updateVehicle(VEHICLE_ID, request);

        assertThat(vehicle.getColor()).isEqualTo("White");
        assertThat(vehicle.getLicensePlate()).isEqualTo("30A-12345");
        assertThat(vehicle.getVin()).isEqualTo(VIN);
        assertThat(vehicle.getMake()).isEqualTo("Honda");
        assertThat(vehicle.getModel()).isEqualTo("Accord");
        assertThat(vehicle.getOdometerKm()).isEqualTo(15000);
        assertThat(vehicle.getIsActive()).isTrue();
    }

    @Test
    void updateVehicle_rejectsMissingOrDeletedVehicle() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> vehicleService.updateVehicle(VEHICLE_ID, updateRequest(NEW_VIN)))
                .isInstanceOf(VehicleNotFoundException.class);
        verifyNoInteractions(vehicleMapper);
        verify(vehicleRepository, never()).save(any());
    }

    @Test
    void getVehicleById_returnsMappedVehicle() {
        Vehicle vehicle = vehicle();
        VehicleResponse expected = response(vehicle);
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(vehicleMapper.toVehicleResponse(vehicle)).willReturn(expected);

        assertThat(vehicleService.getVehicleById(VEHICLE_ID)).isEqualTo(expected);
    }

    @Test
    void getVehicleById_rejectsMissingOrDeletedVehicle() {
        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> vehicleService.getVehicleById(VEHICLE_ID))
                .isInstanceOf(VehicleNotFoundException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VEHICLE_NOT_FOUND);
        verify(vehicleRepository, never()).findByIdRaw(any());
    }

    /**
     * Ràng buộc cốt lõi của đợt tách chủ sở hữu: {@code getVehicles} xuất phát từ
     * XE, không từ khách hàng. Signature mới có đúng ba bộ lọc, nên test gọi với
     * ba tham số — nếu ai đó vô tình thêm lại tham số lọc khách hàng vào đây thì
     * test này sẽ không còn biên dịch nữa.
     */
    @Test
    void getVehicles_normalizesFiltersAndPreservesPageMetadata() {
        Vehicle vehicle = vehicle();
        VehicleResponse expected = response(vehicle);
        Pageable pageable = PageRequest.of(1, 2);
        given(vehicleRepository.search("30A-12345", "Honda", false, pageable))
                .willReturn(new PageImpl<>(List.of(vehicle), pageable, 7));
        given(vehicleMapper.toVehicleResponse(vehicle)).willReturn(expected);

        var result = vehicleService.getVehicles(" 30a-12345 ", " Honda ", false, pageable);

        assertThat(result.items()).containsExactly(expected);
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.size()).isEqualTo(2);
        assertThat(result.totalElements()).isEqualTo(7);
        assertThat(result.totalPages()).isEqualTo(4);
        assertThat(result.hasNext()).isTrue();
        assertThat(result.hasPrevious()).isTrue();
    }

    @Test
    void getVehicles_normalizesBlankFiltersToNull() {
        Pageable pageable = PageRequest.of(0, 20);
        given(vehicleRepository.search(null, null, null, pageable))
                .willReturn(new PageImpl<>(List.of(), pageable, 0));

        var result = vehicleService.getVehicles("  ", " \t ", null, pageable);

        assertThat(result.items()).isEmpty();
        assertThat(result.totalElements()).isZero();
        verify(vehicleRepository).search(null, null, null, pageable);
    }

    @Test
    void getVehicles_acceptsNullFilters() {
        Pageable pageable = PageRequest.of(0, 20);
        given(vehicleRepository.search(null, null, null, pageable))
                .willReturn(new PageImpl<>(List.of(), pageable, 0));

        assertThat(vehicleService.getVehicles(null, null, null, pageable).items()).isEmpty();
    }

    @Test
    void deleteVehicle_softDeletesWithoutRemovingHistory() {
        Vehicle vehicle = vehicle();
        Instant before = Instant.now();
        given(vehicleRepository.findByIdRaw(VEHICLE_ID)).willReturn(Optional.of(vehicle));

        vehicleService.deleteVehicle(VEHICLE_ID);

        assertThat(vehicle.getDeletedAt()).isBetween(before, Instant.now());
        assertThat(vehicle.getIsActive()).isFalse();
        verify(vehicleRepository).save(vehicle);
        verify(vehicleRepository, never()).delete(any());
        verifyNoInteractions(vehicleMapper);
    }

    @Test
    void deleteVehicle_isIdempotent() {
        Vehicle vehicle = vehicle();
        Instant deletedAt = Instant.parse("2026-01-01T00:00:00Z");
        vehicle.setDeletedAt(deletedAt);
        vehicle.setIsActive(false);
        given(vehicleRepository.findByIdRaw(VEHICLE_ID)).willReturn(Optional.of(vehicle));

        vehicleService.deleteVehicle(VEHICLE_ID);

        assertThat(vehicle.getDeletedAt()).isEqualTo(deletedAt);
        assertThat(vehicle.getIsActive()).isFalse();
        verify(vehicleRepository, never()).save(any());
    }

    @Test
    void deleteVehicle_rejectsUnknownId() {
        given(vehicleRepository.findByIdRaw(VEHICLE_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> vehicleService.deleteVehicle(VEHICLE_ID))
                .isInstanceOf(VehicleNotFoundException.class);
        verify(vehicleRepository, never()).save(any());
    }

    private Vehicle vehicle() {
        return Vehicle.builder().id(VEHICLE_ID)
                .licensePlate("30A-12345").vin(VIN).make("Honda").model("Accord")
                .modelYear((short) 2020).odometerKm(15000).color("Black")
                .isActive(true).build();
    }

    private VehicleCreateRequest createRequest(String vin, Boolean active) {
        return new VehicleCreateRequest(" 30a-12345 ", vin, " Honda ", " Accord ",
                (short) 2020, "EX", "Black", "Petrol", "Automatic", 15000, "ghi chú", active);
    }

    private VehicleUpdateRequest updateRequest(String vin) {
        return new VehicleUpdateRequest(null, vin, null, null, null, null, null,
                null, null, null, null, null);
    }

    private VehicleResponse response(Vehicle vehicle) {
        return new VehicleResponse(vehicle.getId(),
                vehicle.getLicensePlate(), vehicle.getVin(), vehicle.getMake(), vehicle.getModel(),
                vehicle.getModelYear(), vehicle.getTrim(), vehicle.getColor(), vehicle.getFuelType(),
                vehicle.getTransmission(), vehicle.getOdometerKm(), vehicle.getNotes(),
                vehicle.getIsActive(), vehicle.getCreatedAt(), vehicle.getUpdatedAt());
    }
}
