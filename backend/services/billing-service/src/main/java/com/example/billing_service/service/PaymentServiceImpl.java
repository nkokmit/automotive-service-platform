package com.example.billing_service.service;

import com.example.billing_service.dto.request.PaymentCreateRequest;
import com.example.billing_service.dto.response.PaymentResponse;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentTransaction paymentTransaction;
    private final InvoiceMapper invoiceMapper;

    @Override
    public PaymentResponse record(PaymentCreateRequest request, UUID processedBy) {
        PaymentResponse existing = paymentRepository.findByIdempotencyKey(request.idempotencyKey().toString())
                .map(invoiceMapper::toResponse)
                .orElse(null);
        if (existing != null) {
            return existing;
        }
        try {
            return paymentTransaction.record(request, processedBy);
        } catch (DataIntegrityViolationException exception) {
            return paymentRepository.findByIdempotencyKey(request.idempotencyKey().toString())
                    .map(invoiceMapper::toResponse)
                    .orElseThrow(() -> exception);
        }
    }

    @Override
    public PaymentResponse refund(UUID paymentId, String reason) {
        return paymentTransaction.refund(paymentId, reason);
    }
}
