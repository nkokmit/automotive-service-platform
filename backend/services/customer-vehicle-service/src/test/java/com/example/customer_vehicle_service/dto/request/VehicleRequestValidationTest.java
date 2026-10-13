package com.example.customer_vehicle_service.dto.request;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VehicleRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final String VIN = "1HGCM82633A004352";

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void createRequiresCustomerAndNonBlankRequiredFields() {
        var request = new VehicleCreateRequest(null, " ", null, "", "\t", null,
                null, null, null, null, null, null, null);

        assertThat(validator.validate(request)).extracting(v -> v.getPropertyPath().toString())
                .contains("customerId", "licensePlate", "make", "model");
    }

    @Test
    void emptyUpdateIsValid() {
        assertThat(validator.validate(update(null, null, null, null, null, null))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t\n"})
    void updateRejectsBlankRequiredFields(String blank) {
        assertThat(validator.validate(update(blank, null, blank, blank, null, null)))
                .extracting(v -> v.getPropertyPath().toString())
                .contains("licensePlate", "make", "model");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {VIN, "1hgcm82633a004352"})
    void acceptsOptionalOrSeventeenCharacterVin(String vin) {
        assertThat(validator.validate(create(vin, (short) 2020, 0))).isEmpty();
        assertThat(validator.validate(update(null, vin, null, null, (short) 2020, 0))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "short", "1HGCM82633A004352X", "                 ", " HGCM82633A004352"})
    void rejectsInvalidVinInCreateAndUpdate(String vin) {
        assertThat(validator.validate(create(vin, (short) 2020, 0)))
                .extracting(v -> v.getPropertyPath().toString()).contains("vin");
        assertThat(validator.validate(update(null, vin, null, null, null, null)))
                .extracting(v -> v.getPropertyPath().toString()).contains("vin");
    }

    @ParameterizedTest
    @ValueSource(ints = {1900, 2100})
    void acceptsYearBoundaries(int year) {
        assertThat(validator.validate(create(null, (short) year, 0))).isEmpty();
        assertThat(validator.validate(update(null, null, null, null, (short) year, 0))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {1899, 2101})
    void rejectsYearOutsideBounds(int year) {
        assertThat(validator.validate(create(null, (short) year, 0)))
                .extracting(v -> v.getPropertyPath().toString()).contains("modelYear");
        assertThat(validator.validate(update(null, null, null, null, (short) year, 0)))
                .extracting(v -> v.getPropertyPath().toString()).contains("modelYear");
    }

    @Test
    void rejectsNegativeOdometer() {
        assertThat(validator.validate(create(null, null, -1)))
                .extracting(v -> v.getPropertyPath().toString()).contains("odometerKm");
        assertThat(validator.validate(update(null, null, null, null, null, -1)))
                .extracting(v -> v.getPropertyPath().toString()).contains("odometerKm");
    }

    @Test
    void enforcesColumnLengthsInCreateAndUpdate() {
        var create = new VehicleCreateRequest(CUSTOMER_ID, "x".repeat(21), null,
                "x".repeat(101), "x".repeat(101), null, "x".repeat(101), "x".repeat(51),
                "x".repeat(31), "x".repeat(31), null, null, null);
        var update = new VehicleUpdateRequest(create.licensePlate(), null, create.make(), create.model(),
                null, create.trim(), create.color(), create.fuelType(), create.transmission(), null,
                null, null, null);

        for (Object request : new Object[]{create, update}) {
            assertThat(validator.validate(request)).extracting(v -> v.getPropertyPath().toString())
                    .contains("licensePlate", "make", "model", "trim", "color", "fuelType", "transmission");
        }
    }

    private VehicleCreateRequest create(String vin, Short year, Integer odometer) {
        return new VehicleCreateRequest(CUSTOMER_ID, "30A-12345", vin, "Honda", "Accord", year,
                null, null, null, null, odometer, null, null);
    }

    private VehicleUpdateRequest update(String plate, String vin, String make, String model,
                                        Short year, Integer odometer) {
        return new VehicleUpdateRequest(plate, vin, make, model, year, null, null, null, null,
                odometer, null, null, null);
    }
}
