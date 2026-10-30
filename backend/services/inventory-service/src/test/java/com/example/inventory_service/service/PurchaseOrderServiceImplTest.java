package com.example.inventory_service.service;

import com.example.inventory_service.dto.response.PurchaseOrderResponse;
import com.example.inventory_service.entity.InventoryTransaction;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.PurchaseOrder;
import com.example.inventory_service.entity.PurchaseOrderItem;
import com.example.inventory_service.entity.Supplier;
import com.example.inventory_service.enums.PurchaseOrderStatus;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.exception.InvalidPurchaseOrderStatusException;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.mapper.PurchaseOrderMapper;
import com.example.inventory_service.repository.InventoryTransactionRepository;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.PurchaseOrderItemRepository;
import com.example.inventory_service.repository.PurchaseOrderRepository;
import com.example.inventory_service.repository.SupplierRepository;
import com.example.inventory_service.security.CurrentActorIdProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Unit test nghiệp vụ đơn nhập hàng, không cần MySQL/Flyway.
 *
 * <p>Trọng tâm là thuật toán giá vốn bình quân tức thời (PLAN.md §5.1):
 *
 * <pre>
 *   cost_price_new = (on_hand * cost_price + quantity * import_price) / (on_hand + quantity)
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceImplTest {

    private static final UUID PO_ID = UUID.randomUUID();
    private static final UUID ACTOR_ID = UUID.randomUUID();
    private static final UUID PART_ID = UUID.randomUUID();
    private static final UUID SUPPLIER_ID = UUID.randomUUID();

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private PurchaseOrderItemRepository itemRepository;
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private PartRepository partRepository;
    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;
    @Mock
    private PurchaseOrderMapper purchaseOrderMapper;
    @Mock
    private CurrentActorIdProvider currentActorIdProvider;

    private PurchaseOrderServiceImpl purchaseOrderService;

    @BeforeEach
    void setUp() {
        purchaseOrderService = new PurchaseOrderServiceImpl(
                purchaseOrderRepository,
                itemRepository,
                supplierRepository,
                partRepository,
                inventoryTransactionRepository,
                purchaseOrderMapper,
                currentActorIdProvider);
    }

    // ---------------------------------------------------------------------
    // Giá vốn bình quân tức thời
    // ---------------------------------------------------------------------

    @Test
    void complete_recalculatesMovingAverageCostFromExistingStockAndImportPrice() {
        // Tồn sẵn có: 10 cái @ 20.00 = 200.00. Nhập thêm 10 cái @ 30.00 = 300.00.
        // Giá vốn mới = (200 + 300) / 20 = 25.00
        Part part = part(BigDecimal.valueOf(20), 10);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 10, BigDecimal.valueOf(30))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        assertThat(part.getCostPrice()).isEqualByComparingTo(BigDecimal.valueOf(25));
        assertThat(part.getOnHandStock()).isEqualTo(20);
    }

    @Test
    void complete_usesImportPriceAsCostWhenStockWasEmpty() {
        // Kho trống: giá vốn bằng đúng giá nhập (0 * cost + 10 * 30) / 10 = 30.00
        Part part = part(BigDecimal.ZERO, 0);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 10, BigDecimal.valueOf(30))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        assertThat(part.getCostPrice()).isEqualByComparingTo(BigDecimal.valueOf(30));
        assertThat(part.getOnHandStock()).isEqualTo(10);
    }

    @Test
    void complete_roundsMovingAverageCostHalfUpToTwoDecimals() {
        // Tồn 3 cái @ 10.00 = 30.00, nhập 2 cái @ 11.50 = 23.00.
        // (30 + 23) / 5 = 10.60
        Part part = part(BigDecimal.valueOf(10), 3);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 2, BigDecimal.valueOf(11.50))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        assertThat(part.getCostPrice()).isEqualByComparingTo(BigDecimal.valueOf(10.60));
        assertThat(part.getCostPrice().scale()).isEqualTo(2);
    }

    @Test
    void complete_keepsCostPriceUnchangedWhenImportPriceMatchesCurrentCost() {
        Part part = part(BigDecimal.valueOf(40), 5);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 7, BigDecimal.valueOf(40))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        assertThat(part.getCostPrice()).isEqualByComparingTo(BigDecimal.valueOf(40));
        assertThat(part.getOnHandStock()).isEqualTo(12);
    }

    @Test
    void complete_doesNotChangeReservedStock() {
        Part part = part(BigDecimal.valueOf(20), 10);
        part.setReservedStock(4);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 5, BigDecimal.valueOf(30))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        assertThat(part.getReservedStock()).isEqualTo(4);
    }

    // ---------------------------------------------------------------------
    // Sổ kho (audit trail)
    // ---------------------------------------------------------------------

    @Test
    void complete_writesOneImportLedgerRowWithStockBeforeAndAfter() {
        Part part = part(BigDecimal.valueOf(20), 10);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 10, BigDecimal.valueOf(30))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        ArgumentCaptor<List<InventoryTransaction>> captor = ArgumentCaptor.forClass(List.class);
        verify(inventoryTransactionRepository).saveAll(captor.capture());
        List<InventoryTransaction> ledger = captor.getValue();
        assertThat(ledger).hasSize(1);

        InventoryTransaction transaction = ledger.get(0);
        assertThat(transaction.getType()).isEqualTo(TransactionType.IMPORT);
        assertThat(transaction.getQuantity()).isEqualTo(10);
        assertThat(transaction.getStockBefore()).isEqualTo(10);
        assertThat(transaction.getStockAfter()).isEqualTo(20);
        assertThat(transaction.getReferenceType()).isEqualTo(ReferenceType.PURCHASE_ORDER);
        assertThat(transaction.getReferenceId()).isEqualTo(PO_ID);
        assertThat(transaction.getCreatedBy()).isEqualTo(ACTOR_ID);
    }

    @Test
    void complete_marksPurchaseOrderAsReceived() {
        Part part = part(BigDecimal.ZERO, 0);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 4, BigDecimal.valueOf(15))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(purchaseOrderMapper.toResponse(any(PurchaseOrder.class), any())).willReturn(response());

        purchaseOrderService.complete(PO_ID);

        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(po.getReceivedAt()).isNotNull();
        verify(purchaseOrderRepository).save(po);
    }

    // ---------------------------------------------------------------------
    // Chặn nhập kho sai trạng thái
    // ---------------------------------------------------------------------

    @Test
    void complete_rejectsPurchaseOrderThatIsNotApproved() {
        PurchaseOrder po = PurchaseOrder.builder()
                .id(PO_ID)
                .code("PO-001")
                .supplier(supplier())
                .status(PurchaseOrderStatus.DRAFT)
                .totalAmount(BigDecimal.ZERO)
                .createdBy(ACTOR_ID)
                .build();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));

        assertThatThrownBy(() -> purchaseOrderService.complete(PO_ID))
                .isInstanceOf(InvalidPurchaseOrderStatusException.class);
        verifyNoInteractions(itemRepository);
        verify(partRepository, never()).saveAll(any());
        verify(inventoryTransactionRepository, never()).saveAll(any());
    }

    @Test
    void complete_rejectsApprovedPurchaseOrderWithoutItems() {
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID)).willReturn(List.of());

        assertThatThrownBy(() -> purchaseOrderService.complete(PO_ID))
                .isInstanceOf(com.example.inventory_service.exception.ApiException.class)
                .extracting(exception -> ((com.example.inventory_service.exception.ApiException) exception).getErrorCode())
                .isEqualTo(com.example.inventory_service.exception.ErrorCode.PURCHASE_ORDER_EMPTY);
        verify(partRepository, never()).saveAll(any());
    }

    @Test
    void complete_rejectsPartThatNoLongerExists() {
        Part part = part(BigDecimal.ZERO, 0);
        PurchaseOrder po = approvedPurchaseOrder();
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
        given(purchaseOrderRepository.findByIdForUpdate(PO_ID)).willReturn(Optional.of(po));
        given(itemRepository.findByPurchaseOrderIdOrderById(PO_ID))
                .willReturn(List.of(item(part, 4, BigDecimal.valueOf(15))));
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> purchaseOrderService.complete(PO_ID))
                .isInstanceOf(PartNotFoundException.class);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private Part part(BigDecimal costPrice, int onHandStock) {
        return Part.builder()
                .id(PART_ID)
                .sku("SKU-001")
                .name("Dầu nhớt 5W-30")
                .unit("LÍT")
                .costPrice(costPrice)
                .sellingPrice(BigDecimal.valueOf(200))
                .onHandStock(onHandStock)
                .reservedStock(0)
                .minStockLevel(5)
                .isActive(Boolean.TRUE)
                .build();
    }

    private PurchaseOrderItem item(Part part, int quantity, BigDecimal importPrice) {
        return PurchaseOrderItem.builder()
                .id(UUID.randomUUID())
                .part(part)
                .quantity(quantity)
                .importPrice(importPrice)
                .totalPrice(importPrice.multiply(BigDecimal.valueOf(quantity)))
                .build();
    }

    private Supplier supplier() {
        return Supplier.builder()
                .id(SUPPLIER_ID)
                .code("SUP-001")
                .name("Nhà cung cấp A")
                .phone("0900000000")
                .isActive(Boolean.TRUE)
                .build();
    }

    private PurchaseOrder approvedPurchaseOrder() {
        return PurchaseOrder.builder()
                .id(PO_ID)
                .code("PO-001")
                .supplier(supplier())
                .status(PurchaseOrderStatus.APPROVED)
                .totalAmount(BigDecimal.valueOf(300))
                .createdBy(ACTOR_ID)
                .build();
    }

    private PurchaseOrderResponse response() {
        return new PurchaseOrderResponse(PO_ID, "PO-001", SUPPLIER_ID, "Nhà cung cấp A",
                PurchaseOrderStatus.RECEIVED, BigDecimal.valueOf(300), ACTOR_ID, null, null,
                null, null, List.of());
    }
}
