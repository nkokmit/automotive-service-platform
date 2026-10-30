package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.entity.InventoryTransaction;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.exception.InsufficientStockException;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.exception.ReservationNotFoundException;
import com.example.inventory_service.mapper.InventoryTransactionMapper;
import com.example.inventory_service.repository.InventoryTransactionRepository;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.security.CurrentActorIdProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Unit test nghiệp vụ tồn kho, không cần MySQL/Flyway.
 *
 * <p>Trọng tâm là các tiêu chí chấp nhận của PLAN.md §5:
 * <ul>
 *   <li>Không bao giờ để tồn thực hoặc tồn giữ chỗ âm.</li>
 *   <li>Mọi biến động đều ghi được sổ kho kèm {@code stock_before}/{@code stock_after}.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class StockServiceImplTest {

    private static final UUID WORK_ORDER_ID = UUID.randomUUID();
    private static final UUID ACTOR_ID = UUID.randomUUID();
    private static final UUID PART_ID = UUID.randomUUID();

    @Mock
    private PartRepository partRepository;
    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;
    @Mock
    private InventoryTransactionMapper inventoryTransactionMapper;
    @Mock
    private CurrentActorIdProvider currentActorIdProvider;

    private StockServiceImpl stockService;

    @BeforeEach
    void setUp() {
        stockService = new StockServiceImpl(
                partRepository,
                inventoryTransactionRepository,
                inventoryTransactionMapper,
                currentActorIdProvider);
        given(currentActorIdProvider.requireCurrentUserId()).willReturn(ACTOR_ID);
    }

    // ---------------------------------------------------------------------
    // Giữ chỗ
    // ---------------------------------------------------------------------

    @Test
    void reserve_increasesReservedStockWithoutTouchingOnHandStock() {
        Part part = part(10, 0);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        stockService.reserve(request(PART_ID, 3));

        assertThat(part.getReservedStock()).isEqualTo(3);
        assertThat(part.getOnHandStock()).isEqualTo(10);
    }

    @Test
    void reserve_writesLedgerRowWithReservedStockBeforeAndAfter() {
        Part part = part(10, 2);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        stockService.reserve(request(PART_ID, 3));

        List<InventoryTransaction> ledger = captureLedger();
        assertThat(ledger).hasSize(1);
        InventoryTransaction transaction = ledger.get(0);
        assertThat(transaction.getType()).isEqualTo(TransactionType.RESERVE);
        assertThat(transaction.getQuantity()).isEqualTo(3);
        assertThat(transaction.getStockBefore()).isEqualTo(2);
        assertThat(transaction.getStockAfter()).isEqualTo(5);
        assertThat(transaction.getReferenceType()).isEqualTo(ReferenceType.WORK_ORDER);
        assertThat(transaction.getReferenceId()).isEqualTo(WORK_ORDER_ID);
        assertThat(transaction.getCreatedBy()).isEqualTo(ACTOR_ID);
    }

    @Test
    void reserve_rejectsQuantityGreaterThanAvailableStock() {
        Part part = part(10, 8);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));

        assertThatThrownBy(() -> stockService.reserve(request(PART_ID, 3)))
                .isInstanceOf(InsufficientStockException.class);
        assertThat(part.getReservedStock()).isEqualTo(8);
        verify(inventoryTransactionRepository, never()).saveAll(any());
    }

    @Test
    void reserve_rejectsInactivePart() {
        Part part = part(10, 0);
        part.setIsActive(Boolean.FALSE);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));

        assertThatThrownBy(() -> stockService.reserve(request(PART_ID, 1)))
                .isInstanceOf(com.example.inventory_service.exception.ApiException.class);
        assertThat(part.getReservedStock()).isZero();
    }

    @Test
    void reserve_rejectsUnknownPart() {
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> stockService.reserve(request(PART_ID, 1)))
                .isInstanceOf(PartNotFoundException.class);
    }

    // ---------------------------------------------------------------------
    // Xuất kho
    // ---------------------------------------------------------------------

    @Test
    void issue_reducesBothOnHandAndReservedStock() {
        Part part = part(10, 4);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.sumOutstandingReservation(
                eq(PART_ID), eq(ReferenceType.WORK_ORDER), eq(WORK_ORDER_ID))).willReturn(4L);
        given(inventoryTransactionRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        stockService.issue(request(PART_ID, 4));

        assertThat(part.getOnHandStock()).isEqualTo(6);
        assertThat(part.getReservedStock()).isZero();
    }

    @Test
    void issue_rejectsQuantityWithoutMatchingReservation() {
        Part part = part(10, 4);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.sumOutstandingReservation(
                eq(PART_ID), eq(ReferenceType.WORK_ORDER), eq(WORK_ORDER_ID))).willReturn(2L);

        assertThatThrownBy(() -> stockService.issue(request(PART_ID, 4)))
                .isInstanceOf(ReservationNotFoundException.class);
        assertThat(part.getOnHandStock()).isEqualTo(10);
        assertThat(part.getReservedStock()).isEqualTo(4);
    }

    @Test
    void issue_neverMakesOnHandStockNegative() {
        Part part = part(2, 4);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.sumOutstandingReservation(
                eq(PART_ID), eq(ReferenceType.WORK_ORDER), eq(WORK_ORDER_ID))).willReturn(4L);

        assertThatThrownBy(() -> stockService.issue(request(PART_ID, 4)))
                .isInstanceOf(InsufficientStockException.class);
        assertThat(part.getOnHandStock()).isEqualTo(2);
    }

    // ---------------------------------------------------------------------
    // Giải phóng giữ chỗ
    // ---------------------------------------------------------------------

    @Test
    void release_reducesReservedStockOnly() {
        Part part = part(10, 4);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.sumOutstandingReservation(
                eq(PART_ID), eq(ReferenceType.WORK_ORDER), eq(WORK_ORDER_ID))).willReturn(4L);
        given(inventoryTransactionRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        stockService.release(request(PART_ID, 4));

        assertThat(part.getReservedStock()).isZero();
        assertThat(part.getOnHandStock()).isEqualTo(10);
    }

    @Test
    void release_rejectsQuantityGreaterThanReservedStock() {
        Part part = part(10, 2);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        // Giữ chỗ còn tồn tại đủ cho 3 cái, nhưng reserved_stock chỉ còn 2.
        given(inventoryTransactionRepository.sumOutstandingReservation(
                eq(PART_ID), eq(ReferenceType.WORK_ORDER), eq(WORK_ORDER_ID))).willReturn(3L);

        assertThatThrownBy(() -> stockService.release(request(PART_ID, 3)))
                .isInstanceOf(InsufficientStockException.class);
        assertThat(part.getReservedStock()).isEqualTo(2);
    }

    @Test
    void release_neverMakesReservedStockNegative() {
        Part part = part(10, 2);
        given(partRepository.findByIdForUpdate(PART_ID)).willReturn(Optional.of(part));
        given(inventoryTransactionRepository.sumOutstandingReservation(
                eq(PART_ID), eq(ReferenceType.WORK_ORDER), eq(WORK_ORDER_ID))).willReturn(5L);

        assertThatThrownBy(() -> stockService.release(request(PART_ID, 5)))
                .isInstanceOf(InsufficientStockException.class);
        assertThat(part.getReservedStock()).isEqualTo(2);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private Part part(int onHandStock, int reservedStock) {
        return Part.builder()
                .id(PART_ID)
                .sku("SKU-001")
                .name("Dầu nhớt 5W-30")
                .unit("LÍT")
                .onHandStock(onHandStock)
                .reservedStock(reservedStock)
                .minStockLevel(5)
                .isActive(Boolean.TRUE)
                .build();
    }

    private StockOperationRequest request(UUID partId, int quantity) {
        return new StockOperationRequest(WORK_ORDER_ID,
                List.of(new StockItemRequest(partId, quantity)), null);
    }

    @SuppressWarnings("unchecked")
    private List<InventoryTransaction> captureLedger() {
        ArgumentCaptor<List<InventoryTransaction>> captor = ArgumentCaptor.forClass(List.class);
        verify(inventoryTransactionRepository).saveAll(captor.capture());
        return captor.getValue();
    }
}
