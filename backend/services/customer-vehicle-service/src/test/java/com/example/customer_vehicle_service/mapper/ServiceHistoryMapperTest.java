package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceHistoryMapperTest {

    private final ServiceHistoryMapper mapper = Mappers.getMapper(ServiceHistoryMapper.class);

    /**
     * {@code customerId} trong DTO là UUID thuần, đọc thẳng từ cột
     * {@code customer_id} của bản ghi chứ không đi qua quan hệ
     * {@code Vehicle.customer} — quan hệ đó không còn tồn tại.
     */
    @Test
    void toServiceHistoryResponse_mapsVehicleAndCustomerIds() {
        UUID vehicleId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        VehicleServiceHistory history = VehicleServiceHistory.builder()
                .id(UUID.randomUUID())
                .vehicle(Vehicle.builder().id(vehicleId).build())
                .customerId(customerId)
                .recordType(ServiceRecordType.EXTERNAL_SERVICE)
                .serviceDate(Instant.parse("2026-01-15T08:30:00Z"))
                .odometerKm(15000)
                .summary("Thay dầu")
                .description("Thay dầu và lọc gió")
                .garageName("Gara An Phú")
                .createdAt(Instant.parse("2026-01-16T00:00:00Z"))
                .build();

        var result = mapper.toServiceHistoryResponse(history);

        assertThat(result.vehicleId()).isEqualTo(vehicleId);
        assertThat(result.customerId()).isEqualTo(customerId);
        assertThat(result.recordType()).isEqualTo(ServiceRecordType.EXTERNAL_SERVICE);
        assertThat(result).usingRecursiveComparison()
                .ignoringFields("vehicleId", "customerId").isEqualTo(history);
    }

    /**
     * Bản ghi nhập hậu kỳ không biết ai mang xe tới thì {@code customerId} là
     * {@code null} — và đó là dữ liệu hợp lệ, không phải lỗi mapping.
     */
    @Test
    void toServiceHistoryResponse_toleratesMissingCustomer() {
        var history = VehicleServiceHistory.builder().id(UUID.randomUUID())
                .vehicle(Vehicle.builder().id(UUID.randomUUID()).build())
                .recordType(ServiceRecordType.CUSTOMER_REPORTED)
                .serviceDate(Instant.parse("2026-01-15T08:30:00Z"))
                .summary("Thay dầu").build();

        assertThat(mapper.toServiceHistoryResponse(history).customerId()).isNull();
    }

    @Test
    void toServiceHistoryResponse_exposesWorkOrderIdForSystemRecords() {
        UUID workOrderId = UUID.randomUUID();
        var history = VehicleServiceHistory.builder().id(UUID.randomUUID())
                .vehicle(Vehicle.builder().id(UUID.randomUUID()).build())
                .workOrderId(workOrderId)
                .recordType(ServiceRecordType.GARAGE_SERVICE)
                .serviceDate(Instant.parse("2026-01-15T08:30:00Z"))
                .summary("Thay dầu").build();

        assertThat(mapper.toServiceHistoryResponse(history).workOrderId()).isEqualTo(workOrderId);
    }

    @Test
    void toServiceHistoryResponse_returnsNullForNullEntity() {
        assertThat(mapper.toServiceHistoryResponse(null)).isNull();
    }
}