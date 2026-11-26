package com.example.work_order_service.dto.request;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CreateWorkOrderFeedbackRequestValidationTest {

    private static Validator validator;
    private static AutoCloseable validatorFactory;

    @BeforeAll
    static void setUp() {
        var factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        validatorFactory = factory::close;
    }

    @AfterAll
    static void tearDown() throws Exception {
        validatorFactory.close();
    }

    @Test
    void acceptsRatingBoundsAndOptionalComment() {
        assertThat(validator.validate(new CreateWorkOrderFeedbackRequest(1, null))).isEmpty();
        assertThat(validator.validate(new CreateWorkOrderFeedbackRequest(5, "Tốt"))).isEmpty();
    }

    @Test
    void rejectsMissingOrOutOfRangeRatingAndOversizedComment() {
        assertThat(validator.validate(new CreateWorkOrderFeedbackRequest(null, null))).isNotEmpty();
        assertThat(validator.validate(new CreateWorkOrderFeedbackRequest(0, null))).isNotEmpty();
        assertThat(validator.validate(new CreateWorkOrderFeedbackRequest(6, null))).isNotEmpty();
        assertThat(validator.validate(new CreateWorkOrderFeedbackRequest(4, "a".repeat(1001)))).isNotEmpty();
    }
}
