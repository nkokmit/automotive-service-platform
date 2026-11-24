package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.PartRequest;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.PartCategory;
import com.example.inventory_service.exception.PartAlreadyExistsException;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.mapper.PartCompatibilityMapper;
import com.example.inventory_service.mapper.PartMapper;
import com.example.inventory_service.repository.PartCategoryRepository;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.PartVehicleCompatibilityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Unit test nghiệp vụ catalog phụ tùng, không cần MySQL/Flyway.
 */
@ExtendWith(MockitoExtension.class)
class PartServiceImplTest {

    private static final UUID PART_ID = UUID.randomUUID();
    private static final UUID CATEGORY_ID = UUID.randomUUID();

    @Mock
    private PartRepository partRepository;
    @Mock
    private PartCategoryRepository partCategoryRepository;
    @Mock
    private PartVehicleCompatibilityRepository compatibilityRepository;
    @Mock
    private PartMapper partMapper;
    @Mock
    private PartCompatibilityMapper compatibilityMapper;

    private PartServiceImpl partService;

    @BeforeEach
    void setUp() {
        partService = new PartServiceImpl(partRepository, partCategoryRepository,
                compatibilityRepository, partMapper, compatibilityMapper);
    }

    @Test
    void createPart_startsWithZeroStockAndZeroCost() {
        given(partRepository.existsBySkuIgnoreCase("SKU-001")).willReturn(false);
        given(partCategoryRepository.findById(CATEGORY_ID)).willReturn(Optional.of(category()));
        given(partRepository.save(any(Part.class))).willAnswer(invocation -> invocation.getArgument(0));

        partService.createPart(request("SKU-001"));

        ArgumentCaptor<Part> captor = ArgumentCaptor.forClass(Part.class);
        verify(partRepository).save(captor.capture());
        Part saved = captor.getValue();
        assertThat(saved.getOnHandStock()).isZero();
        assertThat(saved.getReservedStock()).isZero();
        assertThat(saved.getCostPrice()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(saved.getIsActive()).isTrue();
        assertThat(saved.getSku()).isEqualTo("SKU-001");
    }

    @Test
    void createPart_rejectsDuplicateSkuIgnoringCase() {
        given(partRepository.existsBySkuIgnoreCase("sku-001")).willReturn(true);

        assertThatThrownBy(() -> partService.createPart(request("sku-001")))
                .isInstanceOf(PartAlreadyExistsException.class);
        verify(partRepository, never()).save(any(Part.class));
    }

    @Test
    void getPartById_rejectsUnknownId() {
        given(partRepository.findById(PART_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> partService.getPartById(PART_ID))
                .isInstanceOf(PartNotFoundException.class);
    }

    @Test
    void deletePart_softDeletesByClearingActiveFlag() {
        Part part = part();
        given(partRepository.findById(PART_ID)).willReturn(Optional.of(part));

        partService.deletePart(PART_ID);

        assertThat(part.getIsActive()).isFalse();
        verify(partRepository).save(part);
        verify(partRepository, never()).delete(any(Part.class));
    }

    @Test
    void updatePart_keepsExistingStockUnchanged() {
        Part part = part();
        part.setOnHandStock(7);
        part.setReservedStock(3);
        given(partRepository.findById(PART_ID)).willReturn(Optional.of(part));
        given(partRepository.existsBySkuIgnoreCaseAndIdNot("SKU-001", PART_ID)).willReturn(false);
        given(partRepository.save(any(Part.class))).willAnswer(invocation -> invocation.getArgument(0));

        partService.updatePart(PART_ID, request("SKU-001"));

        assertThat(part.getOnHandStock()).isEqualTo(7);
        assertThat(part.getReservedStock()).isEqualTo(3);
    }

    private PartCategory category() {
        return PartCategory.builder()
                .id(CATEGORY_ID)
                .code("OIL")
                .name("Dầu nhớt")
                .build();
    }

    private Part part() {
        return Part.builder()
                .id(PART_ID)
                .category(category())
                .sku("SKU-001")
                .name("Dầu nhớt 5W-30")
                .unit("LÍT")
                .costPrice(BigDecimal.valueOf(50))
                .sellingPrice(BigDecimal.valueOf(150))
                .onHandStock(0)
                .reservedStock(0)
                .minStockLevel(5)
                .isActive(Boolean.TRUE)
                .build();
    }

    private PartRequest request(String sku) {
        return new PartRequest(CATEGORY_ID, sku, null, "Dầu nhớt 5W-30", null, "LÍT",
                BigDecimal.valueOf(150), null, null);
    }
}
