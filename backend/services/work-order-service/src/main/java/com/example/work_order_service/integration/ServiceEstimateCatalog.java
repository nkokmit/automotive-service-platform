package com.example.work_order_service.integration;

import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;

import java.math.BigDecimal;
import java.util.List;

public record ServiceEstimateCatalog(
        InternalServiceCatalogContract service,
        BigDecimal unitPrice,
        List<InternalServiceBomContract> bom
) {
    public ServiceEstimateCatalog {
        bom = List.copyOf(bom);
    }

    public ServiceEstimateCatalog(InternalServiceCatalogContract service, List<InternalServiceBomContract> bom) {
        this(service, service.baseLaborPrice(), bom);
    }
}
