package com.example.billing_service.service;

import com.example.billing_service.dto.response.InvoiceResponse;
import com.example.billing_service.entity.Invoice;
import com.example.billing_service.entity.InvoiceItem;
import com.example.billing_service.enums.InvoiceItemType;
import com.example.billing_service.enums.InvoiceStatus;
import com.example.billing_service.exception.ApiException;
import com.example.billing_service.exception.ErrorCode;
import com.example.billing_service.integration.contract.EstimateContract;
import com.example.billing_service.integration.contract.WorkOrderContract;
import com.example.billing_service.messaging.event.WorkOrderCompletedEvent;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.repository.InvoiceItemRepository;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceCreationTransaction {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceMapper invoiceMapper;

    @Transactional
    public InvoiceResponse create(WorkOrderContract workOrder, List<EstimateContract> estimates, UUID issuedBy) {
        var existing = invoiceRepository.findByWorkOrderId(workOrder.id());
        if (existing.isPresent()) {
            Invoice invoice = existing.get();
            return invoiceMapper.toResponse(
                    invoice,
                    invoiceItemRepository.findAllByInvoice_Id(invoice.getId()),
                    paymentRepository.findAllByInvoice_IdOrderByPaidAtAsc(invoice.getId())
            );
        }
        if (!"PENDING_PAYMENT".equals(workOrder.status())) {
            throw new ApiException(ErrorCode.WORK_ORDER_NOT_BILLABLE);
        }

        List<InvoiceItem> items = new ArrayList<>();
        BigDecimal subtotalLabor = BigDecimal.ZERO;
        BigDecimal subtotalParts = BigDecimal.ZERO;
        for (EstimateContract estimate : estimates) {
            if (!"APPROVED".equals(estimate.status()) && !"PARTIALLY_APPROVED".equals(estimate.status())) {
                continue;
            }
            for (EstimateContract.ServiceLineContract line : estimate.serviceLines()) {
                if (!"COMPLETED".equals(line.status())) {
                    continue;
                }
                BigDecimal total = amount(line.totalPrice());
                items.add(InvoiceItem.builder()
                        .itemType(InvoiceItemType.SERVICE)
                        .referenceItemId(line.id())
                        .catalogId(line.serviceId())
                        .snapshotCode(line.serviceId().toString())
                        .snapshotName(line.snapshotName())
                        .quantity(1)
                        .unitPrice(amount(line.unitPrice()))
                        .discountAmount(BigDecimal.ZERO.setScale(2))
                        .taxRate(BigDecimal.ZERO.setScale(2))
                        .totalPrice(total)
                        .build());
                subtotalLabor = subtotalLabor.add(total);
            }
            for (EstimateContract.PartLineContract line : estimate.partLines()) {
                int issuedQuantity = line.issuedQuantity() == null ? 0 : line.issuedQuantity();
                if (issuedQuantity <= 0) {
                    continue;
                }
                BigDecimal unitPrice = amount(line.unitPrice());
                BigDecimal total = unitPrice.multiply(BigDecimal.valueOf(issuedQuantity)).setScale(2, RoundingMode.HALF_UP);
                items.add(InvoiceItem.builder()
                        .itemType(InvoiceItemType.PART)
                        .referenceItemId(line.id())
                        .catalogId(line.partId())
                        .snapshotCode(line.snapshotSku())
                        .snapshotName(line.snapshotName())
                        .quantity(issuedQuantity)
                        .unitPrice(unitPrice)
                        .discountAmount(BigDecimal.ZERO.setScale(2))
                        .taxRate(BigDecimal.ZERO.setScale(2))
                        .totalPrice(total)
                        .build());
                subtotalParts = subtotalParts.add(total);
            }
        }
        if (items.isEmpty()) {
            throw new ApiException(ErrorCode.WORK_ORDER_NOT_BILLABLE, "Work Order không có hạng mục được tính phí");
        }

        return persistInvoice(
                workOrder.id(), workOrder.customerId(), workOrder.vehicleId(), issuedBy,
                items, subtotalLabor, subtotalParts);
    }

    @Transactional
    public InvoiceResponse createFromCompletedEvent(WorkOrderCompletedEvent event) {
        var existing = invoiceRepository.findByWorkOrderId(event.workOrderId());
        if (existing.isPresent()) {
            Invoice invoice = existing.get();
            return invoiceMapper.toResponse(
                    invoice,
                    invoiceItemRepository.findAllByInvoice_Id(invoice.getId()),
                    paymentRepository.findAllByInvoice_IdOrderByPaidAtAsc(invoice.getId())
            );
        }

        List<InvoiceItem> items = new ArrayList<>();
        BigDecimal subtotalLabor = BigDecimal.ZERO;
        BigDecimal subtotalParts = BigDecimal.ZERO;
        for (WorkOrderCompletedEvent.WorkOrderCompletedServiceItem line : event.services()) {
            BigDecimal total = amount(line.totalPrice());
            items.add(InvoiceItem.builder()
                    .itemType(InvoiceItemType.SERVICE)
                    .referenceItemId(line.serviceLineId())
                    .catalogId(line.serviceId())
                    .snapshotCode(line.serviceId().toString())
                    .snapshotName(line.name())
                    .quantity(1)
                    .unitPrice(amount(line.unitPrice()))
                    .discountAmount(BigDecimal.ZERO.setScale(2))
                    .taxRate(BigDecimal.ZERO.setScale(2))
                    .totalPrice(total)
                    .build());
            subtotalLabor = subtotalLabor.add(total);
        }
        for (WorkOrderCompletedEvent.WorkOrderCompletedPartItem line : event.parts()) {
            if (line.quantity() <= 0) {
                continue;
            }
            BigDecimal unitPrice = amount(line.unitPrice());
            BigDecimal total = unitPrice.multiply(BigDecimal.valueOf(line.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            items.add(InvoiceItem.builder()
                    .itemType(InvoiceItemType.PART)
                    .referenceItemId(line.workOrderPartId())
                    .catalogId(line.partId())
                    .snapshotCode(line.sku())
                    .snapshotName(line.name())
                    .quantity(line.quantity())
                    .unitPrice(unitPrice)
                    .discountAmount(BigDecimal.ZERO.setScale(2))
                    .taxRate(BigDecimal.ZERO.setScale(2))
                    .totalPrice(total)
                    .build());
            subtotalParts = subtotalParts.add(total);
        }
        if (items.isEmpty()) {
            throw new ApiException(ErrorCode.WORK_ORDER_NOT_BILLABLE, "Work Order không có hạng mục được tính phí");
        }
        return persistInvoice(
                event.workOrderId(), event.customerId(), event.vehicleId(), null,
                items, subtotalLabor, subtotalParts);
    }

    private InvoiceResponse persistInvoice(
            UUID workOrderId,
            UUID customerId,
            UUID vehicleId,
            UUID issuedBy,
            List<InvoiceItem> items,
            BigDecimal subtotalLabor,
            BigDecimal subtotalParts
    ) {
        subtotalLabor = amount(subtotalLabor);
        subtotalParts = amount(subtotalParts);
        BigDecimal grandTotal = subtotalLabor.add(subtotalParts).setScale(2, RoundingMode.HALF_UP);
        Invoice invoice = invoiceRepository.saveAndFlush(Invoice.builder()
                .code("INV-" + UUID.randomUUID())
                .workOrderId(workOrderId)
                .customerId(customerId)
                .vehicleId(vehicleId)
                .subtotalLabor(subtotalLabor)
                .subtotalParts(subtotalParts)
                .discountAmount(BigDecimal.ZERO.setScale(2))
                .taxAmount(BigDecimal.ZERO.setScale(2))
                .grandTotal(grandTotal)
                .paidAmount(BigDecimal.ZERO.setScale(2))
                .status(InvoiceStatus.UNPAID)
                .issuedBy(issuedBy)
                .build());
        items.forEach(item -> item.setInvoice(invoice));
        invoiceItemRepository.saveAll(items);
        return invoiceMapper.toResponse(invoice, items, List.of());
    }

    private BigDecimal amount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }
}
