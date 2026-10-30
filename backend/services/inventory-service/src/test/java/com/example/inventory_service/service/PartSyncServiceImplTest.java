package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.PartPricingRequest;
import com.example.inventory_service.dto.request.StockAvailabilityRequest;
import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.repository.PartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * Unit test cho hai API đồng bộ (PLAN.md §4.3): kiểm tra tồn kho và lấy đơn giá.
 *
 * <p>Hai endpoint này phục vụ service khác gọi đồng bộ nên phải trả lời
 * được ngay: không ghi sổ kho, không giữ state của client.
 */
@ExtendWith(MockitoExtension.class)
class PartSyncServiceImplTest {

    private static final UUID PART_ID = UUID.randomUUID();
    private static final UUID OTHER_PART_ID = UUID.randomUUID();

    @Mock
    private PartRepository partRepository;

    private PartSyncServiceImpl partSyncService;

    @BeforeEach
    void setUp() {
        partSyncService = new PartSyncServiceImpl(partRepository);
    }

    // ---------------------------------------------------------------------
    // Kiểm tra tồn kho
    // ---------------------------------------------------------------------

    @Test
    void checkAvailability_reportsAvailableStockAsOnHandMinusReserved() {
        Part part = part(PART_ID, "SKU-001", 10, 4);
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var result = partSyncService.checkAvailability(availability(PART_ID, 3));

        assertThat(result).hasSize(1);
        var item = result.get(0);
        assertThat(item.partId()).isEqualTo(PART_ID);
        assertThat(item.onHandStock()).isEqualTo(10);
        assertThat(item.reservedStock()).isEqualTo(4);
        assertThat(item.availableStock()).isEqualTo(6);
        assertThat(item.requestedQuantity()).isEqualTo(3);
        assertThat(item.sufficient()).isTrue();
        assertThat(item.isActive()).isTrue();
    }

    @Test
    void checkAvailability_marksInsufficientWhenRequestedExceedsAvailable() {
        Part part = part(PART_ID, "SKU-001", 10, 4);
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var result = partSyncService.checkAvailability(availability(PART_ID, 7));

        assertThat(result.get(0).availableStock()).isEqualTo(6);
        assertThat(result.get(0).sufficient()).isFalse();
    }

    @Test
    void checkAvailability_marksInsufficientForInactivePartEvenWithStock() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        part.setIsActive(Boolean.FALSE);
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var result = partSyncService.checkAvailability(availability(PART_ID, 1));

        assertThat(result.get(0).availableStock()).isEqualTo(10);
        assertThat(result.get(0).isActive()).isFalse();
        assertThat(result.get(0).sufficient()).isFalse();
    }

    @Test
    void checkAvailability_mergesDuplicatePartLinesIntoOneEntry() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var request = new StockAvailabilityRequest(List.of(
                new StockItemRequest(PART_ID, 2),
                new StockItemRequest(PART_ID, 3)));

        var result = partSyncService.checkAvailability(request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).requestedQuantity()).isEqualTo(5);
        assertThat(result.get(0).sufficient()).isTrue();
    }

    @Test
    void checkAvailability_keepsOrderOfFirstAppearance() {
        Part first = part(PART_ID, "SKU-001", 10, 0);
        Part second = part(OTHER_PART_ID, "SKU-002", 10, 0);
        given(partRepository.findAllById(any())).willReturn(List.of(first, second));

        var request = new StockAvailabilityRequest(List.of(
                new StockItemRequest(OTHER_PART_ID, 1),
                new StockItemRequest(PART_ID, 1)));

        var result = partSyncService.checkAvailability(request);

        assertThat(result).extracting(item -> item.partId())
                .containsExactly(OTHER_PART_ID, PART_ID);
    }

    @Test
    void checkAvailability_rejectsUnknownPartInsteadOfSilentlyDroppingIt() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var request = new StockAvailabilityRequest(List.of(
                new StockItemRequest(PART_ID, 1),
                new StockItemRequest(OTHER_PART_ID, 1)));

        assertThatThrownBy(() -> partSyncService.checkAvailability(request))
                .isInstanceOf(PartNotFoundException.class)
                .hasMessageContaining(OTHER_PART_ID.toString());
    }

    // ---------------------------------------------------------------------
    // Lấy đơn giá
    // ---------------------------------------------------------------------

    @Test
    void getPricing_multipliesSellingPriceByQuantity() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        part.setSellingPrice(BigDecimal.valueOf(150.50));
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var result = partSyncService.getPricing(pricing(PART_ID, 4));

        assertThat(result).hasSize(1);
        var item = result.get(0);
        assertThat(item.sellingPrice()).isEqualByComparingTo(BigDecimal.valueOf(150.50));
        assertThat(item.quantity()).isEqualTo(4);
        assertThat(item.lineTotal()).isEqualByComparingTo(BigDecimal.valueOf(602.00));
        assertThat(item.lineTotal().scale()).isEqualTo(2);
    }

    @Test
    void getPricing_reportsAvailableStockAlongsidePrice() {
        Part part = part(PART_ID, "SKU-001", 10, 3);
        part.setSellingPrice(BigDecimal.valueOf(99));
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var result = partSyncService.getPricing(pricing(PART_ID, 1));

        assertThat(result.get(0).availableStock()).isEqualTo(7);
        assertThat(result.get(0).isActive()).isTrue();
    }

    @Test
    void getPricing_doesNotExposeCostPrice() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        part.setCostPrice(BigDecimal.valueOf(75));
        part.setSellingPrice(BigDecimal.valueOf(120));
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var result = partSyncService.getPricing(pricing(PART_ID, 1));

        assertThat(result.get(0).getClass().getRecordComponents())
                .extracting(component -> component.getName())
                .doesNotContain("costPrice");
    }

    @Test
    void getPricing_mergesDuplicatePartLinesBeforeTotalling() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        part.setSellingPrice(BigDecimal.valueOf(10));
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        var request = new PartPricingRequest(List.of(
                new StockItemRequest(PART_ID, 2),
                new StockItemRequest(PART_ID, 3)));

        var result = partSyncService.getPricing(request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).quantity()).isEqualTo(5);
        assertThat(result.get(0).lineTotal()).isEqualByComparingTo(BigDecimal.valueOf(50));
    }

    @Test
    void getPricing_rejectsUnknownPart() {
        given(partRepository.findAllById(any())).willReturn(List.of());

        assertThatThrownBy(() -> partSyncService.getPricing(pricing(PART_ID, 1)))
                .isInstanceOf(PartNotFoundException.class);
    }

    @Test
    void syncEndpoints_doNotWriteToTheDatabase() {
        Part part = part(PART_ID, "SKU-001", 10, 0);
        given(partRepository.findAllById(any())).willReturn(List.of(part));

        partSyncService.checkAvailability(availability(PART_ID, 1));
        partSyncService.getPricing(pricing(PART_ID, 1));

        verify(partRepository, org.mockito.Mockito.never()).save(any(Part.class));
        verify(partRepository, org.mockito.Mockito.never()).saveAll(any());
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private Part part(UUID id, String sku, int onHandStock, int reservedStock) {
        return Part.builder()
                .id(id)
                .sku(sku)
                .name("Phụ tùng " + sku)
                .unit("CÁI")
                .costPrice(BigDecimal.valueOf(50))
                .sellingPrice(BigDecimal.valueOf(100))
                .onHandStock(onHandStock)
                .reservedStock(reservedStock)
                .minStockLevel(5)
                .isActive(Boolean.TRUE)
                .build();
    }

    private StockAvailabilityRequest availability(UUID partId, int quantity) {
        return new StockAvailabilityRequest(List.of(new StockItemRequest(partId, quantity)));
    }

    private PartPricingRequest pricing(UUID partId, int quantity) {
        return new PartPricingRequest(List.of(new StockItemRequest(partId, quantity)));
    }
}
