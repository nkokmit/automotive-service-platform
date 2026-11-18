package com.example.billing_service.service;

import com.example.billing_service.dto.response.InvoicePageResponse;
import com.example.billing_service.dto.response.InvoiceResponse;
import com.example.billing_service.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface InvoiceService {

    InvoiceResponse createFromWorkOrder(UUID workOrderId, UUID issuedBy);

    InvoicePageResponse search(
            InvoiceStatus status,
            UUID customerId,
            Instant from,
            Instant to,
            int page,
            int size
    );

    InvoiceResponse get(UUID invoiceId);

    InvoicePageResponse getMine(UUID customerId, int page, int size);

    InvoiceResponse updateDiscount(UUID invoiceId, BigDecimal discountAmount, String note);

    InvoiceResponse voidInvoice(UUID invoiceId, String reason);
}
