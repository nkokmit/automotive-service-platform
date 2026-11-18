package com.example.billing_service.service;

import com.example.billing_service.dto.response.InvoicePageResponse;
import com.example.billing_service.dto.response.InvoiceResponse;
import com.example.billing_service.entity.Invoice;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.exception.ApiException;
import com.example.billing_service.exception.ErrorCode;
import com.example.billing_service.integration.client.WorkOrderClient;
import com.example.billing_service.integration.contract.EstimateContract;
import com.example.billing_service.integration.contract.EstimateSummaryContract;
import com.example.billing_service.integration.contract.ServiceApiResponse;
import com.example.billing_service.integration.contract.WorkOrderContract;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.repository.InvoiceItemRepository;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final WorkOrderClient workOrderClient;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceCreationTransaction invoiceCreationTransaction;
    private final InvoiceMutationTransaction invoiceMutationTransaction;
    private final InvoiceMapper invoiceMapper;

    @Override
    public InvoiceResponse createFromWorkOrder(UUID workOrderId, UUID issuedBy) {
        Invoice existing = invoiceRepository.findByWorkOrderId(workOrderId).orElse(null);
        if (existing != null) {
            return detailed(existing);
        }

        ServiceApiResponse<WorkOrderContract> workOrderResult = workOrderClient.getWorkOrder(workOrderId);
        if (workOrderResult == null || workOrderResult.code() != 0 || workOrderResult.result() == null) {
            throw new ApiException(ErrorCode.WORK_ORDER_SERVICE_UNAVAILABLE, "Không lấy được Work Order hợp lệ");
        }
        WorkOrderContract workOrder = workOrderResult.result();
        List<EstimateContract> estimates = new ArrayList<>();
        for (EstimateSummaryContract estimateSummary : workOrder.estimates()) {
            if (!"APPROVED".equals(estimateSummary.status()) && !"PARTIALLY_APPROVED".equals(estimateSummary.status())) {
                continue;
            }
            ServiceApiResponse<EstimateContract> estimateResult = workOrderClient.getEstimate(estimateSummary.id());
            if (estimateResult == null || estimateResult.code() != 0 || estimateResult.result() == null) {
                throw new ApiException(ErrorCode.WORK_ORDER_SERVICE_UNAVAILABLE, "Không lấy được chi tiết Estimate");
            }
            estimates.add(estimateResult.result());
        }

        try {
            return invoiceCreationTransaction.create(workOrder, estimates, issuedBy);
        } catch (DataIntegrityViolationException exception) {
            Invoice concurrentInvoice = invoiceRepository.findByWorkOrderId(workOrderId).orElse(null);
            if (concurrentInvoice != null) {
                return detailed(concurrentInvoice);
            }
            throw exception;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public InvoicePageResponse search(
            InvoiceStatus status,
            UUID customerId,
            Instant from,
            Instant to,
            int page,
            int size
    ) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "from phải nhỏ hơn hoặc bằng to");
        }
        return invoiceMapper.toPageResponse(invoiceRepository.search(
                status,
                customerId,
                from,
                to,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "issuedAt"))
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse get(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ApiException(ErrorCode.INVOICE_NOT_FOUND));
        return detailed(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoicePageResponse getMine(UUID customerId, int page, int size) {
        return search(null, customerId, null, null, page, size);
    }

    @Override
    public InvoiceResponse updateDiscount(UUID invoiceId, BigDecimal discountAmount, String note) {
        return invoiceMutationTransaction.updateDiscount(invoiceId, discountAmount, note);
    }

    @Override
    public InvoiceResponse voidInvoice(UUID invoiceId, String reason) {
        return invoiceMutationTransaction.voidInvoice(invoiceId, reason);
    }

    private InvoiceResponse detailed(Invoice invoice) {
        return invoiceMapper.toResponse(
                invoice,
                invoiceItemRepository.findAllByInvoice_Id(invoice.getId()),
                paymentRepository.findAllByInvoice_IdOrderByPaidAtAsc(invoice.getId())
        );
    }
}
