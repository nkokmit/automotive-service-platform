package com.example.customer_vehicle_service.dto.request;

import com.example.customer_vehicle_service.enums.ServiceRecordType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceHistoryRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;
    private static final Instant SERVICE_DATE = Instant.parse("2026-01-15T08:30:00Z");

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
    void createRequiresRecordTypeServiceDateAndSummary() {
        var request = new ServiceHistoryCreateRequest(null, null, null, " ", null, null);

        assertThat(validator.validate(request)).extracting(v -> v.getPropertyPath().toString())
                .contains("recordType", "serviceDate", "summary");
    }

    @Test
    void validExternalServiceRecordPassesValidation() {
        assertThat(validator.validate(request(ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu",
                SERVICE_DATE, 15000, "Gara An Phú"))).isEmpty();
    }

    @Test
    void validCustomerReportedRecordPassesValidationWithNullOptionalFields() {
        assertThat(validator.validate(request(ServiceRecordType.CUSTOMER_REPORTED, "Thay phanh",
                SERVICE_DATE, null, null))).isEmpty();
    }

    /**
     * {@code odometerKm} là tuỳ chọn — để trống hợp lệ (chưa biết số km), nhưng nếu
     * có thì không được âm vì cột là {@code INT UNSIGNED}. Vì vậy {@code null} cố ý
     * không nằm trong nguồn dữ liệu của test này.
     */
    @ParameterizedTest
    @ValueSource(ints = {-1, -1000})
    void createRejectsNegativeOdometer(int odometerKm) {
        assertThat(validator.validate(request(ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu",
                SERVICE_DATE, odometerKm, null)))
                .extracting(v -> v.getPropertyPath().toString()).contains("odometerKm");
    }

    @Test
    void createAcceptsNullOdometerBecauseColumnIsNullable() {
        assertThat(validator.validate(request(ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu",
                SERVICE_DATE, null, null))).isEmpty();
    }

    @Test
    void createRejectsFutureServiceDate() {
        var futureDate = Instant.now().plus(1, ChronoUnit.DAYS);

        assertThat(validator.validate(request(ServiceRecordType.EXTERNAL_SERVICE, "Thay dầu",
                futureDate, null, null)))
                .extracting(v -> v.getPropertyPath().toString()).contains("serviceDate");
    }

    @Test
    void createRejectsOversizedSummaryAndGarageName() {
        assertThat(validator.validate(request(ServiceRecordType.EXTERNAL_SERVICE, "x".repeat(256),
                SERVICE_DATE, null, "y".repeat(151))))
                .extracting(v -> v.getPropertyPath().toString())
                .contains("summary", "garageName");
    }

    /**
     * {@code GARAGE_SERVICE} hợp lệ về mặt validation — ràng buộc loại bản ghi nằm
     * ở service vì đó là quy tắc nghiệp vụ, không phải ràng buộc định dạng. Test
     * service đã cover việc loại này bị từ chối.
     */
    @Test
    void garageServiceTypeIsStructurallyValidAtDtoLevel() {
        assertThat(validator.validate(request(ServiceRecordType.GARAGE_SERVICE, "Thay dầu",
                SERVICE_DATE, null, null))).isEmpty();
    }

    private ServiceHistoryCreateRequest request(ServiceRecordType type, String summary,
                                               Instant serviceDate, Integer odometerKm,
                                               String garageName) {
        return new ServiceHistoryCreateRequest(type, serviceDate, odometerKm, summary,
                null, garageName);
    }
}