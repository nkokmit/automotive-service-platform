package com.example.billing_service.service;

import com.example.billing_service.dto.request.PaymentCreateRequest;
import com.example.billing_service.dto.response.PaymentResponse;

import java.util.UUID;

public interface PaymentService {

    PaymentResponse record(PaymentCreateRequest request, UUID processedBy);

    PaymentResponse refund(UUID paymentId, String reason);
}
