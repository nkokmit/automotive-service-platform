package com.example.billing_service.service;

import com.example.billing_service.entity.Invoice;
import com.example.billing_service.entity.InvoiceItem;
import com.example.billing_service.integration.contract.EstimateContract;
import com.example.billing_service.integration.contract.WorkOrderContract;
import com.example.billing_service.messaging.event.WorkOrderCompletedEvent;
import com.example.billing_service.mapper.InvoiceMapper;
import com.example.billing_service.repository.InvoiceItemRepository;
import com.example.billing_service.repository.InvoiceRepository;
import com.example.billing_service.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceCreationTransactionTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceItemRepository invoiceItemRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Spy
    private InvoiceMapper invoiceMapper = new InvoiceMapper();

    @InjectMocks
    private InvoiceCreationTransaction transaction;

    @Test
    void createsInvoiceFromCompletedServicesAndIssuedPartQuantityOnly() {
        UUID workOrderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        EstimateContract estimate = new EstimateContract(
                UUID.randomUUID(),
                workOrderId,
                "APPROVED",
                List.of(
                        new EstimateContract.ServiceLineContract(
                                UUID.randomUUID(), serviceId, "Oil change",
                                new BigDecimal("100.00"), new BigDecimal("100.00"), "COMPLETED"),
                        new EstimateContract.ServiceLineContract(
                                UUID.randomUUID(), serviceId, "Inspection",
                                new BigDecimal("50.00"), new BigDecimal("50.00"), "REJECTED")
                ),
                List.of(new EstimateContract.PartLineContract(
                        UUID.randomUUID(), partId, "Oil filter", "FILTER-1",
                        2, new BigDecimal("25.00")))
        );
        when(invoiceRepository.findByWorkOrderId(workOrderId)).thenReturn(Optional.empty());
        when(invoiceRepository.saveAndFlush(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(invoiceItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = transaction.create(
                new WorkOrderContract(workOrderId, "WO-1", null, customerId, vehicleId, "PENDING_PAYMENT", List.of()),
                List.of(estimate),
                UUID.randomUUID()
        );

        ArgumentCaptor<Invoice> invoiceCaptor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).saveAndFlush(invoiceCaptor.capture());
        ArgumentCaptor<Iterable<InvoiceItem>> itemsCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(invoiceItemRepository).saveAll(itemsCaptor.capture());

        assertEquals(workOrderId, response.workOrderId());
        assertEquals(new BigDecimal("100.00"), invoiceCaptor.getValue().getSubtotalLabor());
        assertEquals(new BigDecimal("50.00"), invoiceCaptor.getValue().getSubtotalParts());
        assertEquals(new BigDecimal("150.00"), invoiceCaptor.getValue().getGrandTotal());
        List<InvoiceItem> items = java.util.stream.StreamSupport.stream(
                itemsCaptor.getValue().spliterator(), false).toList();
        assertEquals(2, items.size());
        assertEquals(2, items.stream()
                .filter(item -> item.getCatalogId().equals(partId))
                .findFirst().orElseThrow().getQuantity());
        assertTrue(items.stream().noneMatch(item -> item.getSnapshotName().equals("Inspection")));
    }

    @Test
    void createsInvoiceFromCompletedEventSnapshots() {
        UUID workOrderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        when(invoiceRepository.findByWorkOrderId(workOrderId)).thenReturn(Optional.empty());
        when(invoiceRepository.saveAndFlush(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(invoiceItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = transaction.createFromCompletedEvent(new WorkOrderCompletedEvent(
                UUID.randomUUID(),
                workOrderId,
                customerId,
                vehicleId,
                List.of(new WorkOrderCompletedEvent.WorkOrderCompletedServiceItem(
                        UUID.randomUUID(), serviceId, "Repair", new BigDecimal("80.00"), new BigDecimal("80.00"))),
                List.of(
                        new WorkOrderCompletedEvent.WorkOrderCompletedPartItem(
                                UUID.randomUUID(), partId, "Filter", "FILTER-1", "piece", 2,
                                new BigDecimal("12.50"), new BigDecimal("25.00")),
                        new WorkOrderCompletedEvent.WorkOrderCompletedPartItem(
                                UUID.randomUUID(), partId, "Unused", "FILTER-2", "piece", 0,
                                new BigDecimal("5.00"), BigDecimal.ZERO)),
                new BigDecimal("105.00"),
                java.time.Instant.now()));

        ArgumentCaptor<Invoice> invoiceCaptor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).saveAndFlush(invoiceCaptor.capture());
        ArgumentCaptor<Iterable<InvoiceItem>> itemsCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(invoiceItemRepository).saveAll(itemsCaptor.capture());
        List<InvoiceItem> items = java.util.stream.StreamSupport.stream(
                itemsCaptor.getValue().spliterator(), false).toList();

        assertEquals(workOrderId, response.workOrderId());
        assertEquals(new BigDecimal("80.00"), invoiceCaptor.getValue().getSubtotalLabor());
        assertEquals(new BigDecimal("25.00"), invoiceCaptor.getValue().getSubtotalParts());
        assertEquals(2, items.size());
        assertEquals(2, items.stream()
                .filter(item -> item.getItemType().name().equals("PART"))
                .findFirst().orElseThrow().getQuantity());
    }
}
