package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.entity.Customer;
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

    @Test
    void toServiceHistoryResponse_mapsVehicleIdAndAllPublicFields() {
        UUID vehicleId = UUID.randomUUID();
        VehicleServiceHistory history = VehicleServiceHistory.builder()
                .id(UUID.randomUUID())
                .vehicle(Vehicle.builder().id(vehicleId)
                        .customer(Customer.builder().id(UUID.randomUUID()).build()).build())
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
        assertThat(result.recordType()).isEqualTo(ServiceRecordType.EXTERNAL_SERVICE);
        assertThat(result).usingRecursiveComparison().ignoringFields("vehicleId").isEqualTo(history);
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