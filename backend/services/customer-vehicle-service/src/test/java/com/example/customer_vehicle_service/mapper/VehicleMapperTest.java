package com.example.customer_vehicle_service.mapper;

import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.entity.Vehicle;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VehicleMapperTest {

    private final VehicleMapper mapper = Mappers.getMapper(VehicleMapper.class);

    @Test
    void toVehicleResponse_mapsOwnerIdAndAllPublicFields() {
        UUID ownerId = UUID.randomUUID();
        Vehicle vehicle = Vehicle.builder().id(UUID.randomUUID())
                .customer(Customer.builder().id(ownerId).build())
                .licensePlate("30A-12345").vin("1HGCM82633A004352")
                .make("Honda").model("Accord").modelYear((short) 2020)
                .trim("EX").color("Black").fuelType("Petrol").transmission("Automatic")
                .odometerKm(15000).notes("ghi chú").isActive(false)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-02-01T00:00:00Z"))
                .deletedAt(Instant.parse("2026-03-01T00:00:00Z")).build();

        var result = mapper.toVehicleResponse(vehicle);

        assertThat(result.customerId()).isEqualTo(ownerId);
        assertThat(result).usingRecursiveComparison().ignoringFields("customerId")
                .isEqualTo(vehicle);
        assertThat(result.getClass().getRecordComponents()).extracting("name")
                .doesNotContain("deletedAt", "customerName", "customer");
    }

    @Test
    void toVehicleResponse_returnsNullForNullEntity() {
        assertThat(mapper.toVehicleResponse(null)).isNull();
    }
}
