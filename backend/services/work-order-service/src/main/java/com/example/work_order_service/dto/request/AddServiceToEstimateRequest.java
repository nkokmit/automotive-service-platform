package com.example.work_order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record AddServiceToEstimateRequest(
        @NotNull UUID serviceId,

        @DecimalMin(value = "0.00", message = "Đơn giá tùy chỉnh không được âm")
        @Digits(integer = 10, fraction = 2,
                message = "Đơn giá tùy chỉnh tối đa 10 chữ số nguyên và 2 chữ số thập phân")
        @JsonProperty("custom_unit_price")
        @JsonAlias("customUnitPrice")
        BigDecimal customUnitPrice,

        @JsonProperty("auto_expand_bom")
        @JsonAlias("autoExpandBom")
        Boolean autoExpandBom
) {
    public AddServiceToEstimateRequest(UUID serviceId) {
        this(serviceId, null, true);
    }

    public boolean shouldExpandBom() {
        return !Boolean.FALSE.equals(autoExpandBom);
    }
}
