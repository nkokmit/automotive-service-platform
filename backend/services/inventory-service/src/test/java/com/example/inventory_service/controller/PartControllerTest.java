package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.dto.response.PartCompatibilityResponse;
import com.example.inventory_service.dto.response.PartPricingResponse;
import com.example.inventory_service.dto.response.PartResponse;
import com.example.inventory_service.dto.response.StockAvailabilityResponse;
import com.example.inventory_service.exception.GlobalExceptionHandler;
import com.example.inventory_service.service.PartService;
import com.example.inventory_service.service.PartSyncService;
import com.example.inventory_service.service.StockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test contract HTTP của {@link PartController}.
 *
 * <p>Chạy bằng {@code MockMvcBuilders.standaloneSetup} nên không cần MySQL,
 * Flyway hay JWT secret — giống cách các service khác test controller.
 */
@ExtendWith(MockitoExtension.class)
class PartControllerTest {

    private static final UUID PART_ID = UUID.randomUUID();

    @Mock
    private PartService partService;
    @Mock
    private StockService stockService;
    @Mock
    private PartSyncService partSyncService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new PartController(partService, stockService, partSyncService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ---------------------------------------------------------------------
    // API đồng bộ (PLAN.md §4.3)
    // ---------------------------------------------------------------------

    @Test
    void checkAvailability_returnsStandardApiResponseEnvelope() throws Exception {
        UUID requestedPartId = UUID.randomUUID();
        given(partSyncService.checkAvailability(any())).willReturn(List.of(
                new StockAvailabilityResponse(requestedPartId, "SKU-001", "Dầu nhớt 5W-30",
                        3, 10, 4, 6, true, true)));

        mvc.perform(post("/api/parts/check-availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"partId\":\"" + requestedPartId + "\",\"quantity\":3}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.message").value("Success"))
                .andExpect(jsonPath("$.result[0].partId").value(requestedPartId.toString()))
                .andExpect(jsonPath("$.result[0].availableStock").value(6))
                .andExpect(jsonPath("$.result[0].sufficient").value(true));
    }

    @Test
    void pricing_returnsUnitPriceAndLineTotal() throws Exception {
        UUID requestedPartId = UUID.randomUUID();
        given(partSyncService.getPricing(any())).willReturn(List.of(
                new PartPricingResponse(requestedPartId, "SKU-001", "Dầu nhớt 5W-30", "LÍT",
                        BigDecimal.valueOf(150.50), 4, BigDecimal.valueOf(602.00), 10, true)));

        mvc.perform(post("/api/parts/pricing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"partId\":\"" + requestedPartId + "\",\"quantity\":4}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result[0].sellingPrice").value(150.50))
                .andExpect(jsonPath("$.result[0].lineTotal").value(602.00))
                .andExpect(jsonPath("$.result[0].quantity").value(4));
    }

    @Test
    void checkAvailability_rejectsEmptyItemList() throws Exception {
        mvc.perform(post("/api/parts/check-availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
    }

    @Test
    void checkAvailability_rejectsNonPositiveQuantity() throws Exception {
        mvc.perform(post("/api/parts/check-availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"partId\":\"" + PART_ID + "\",\"quantity\":0}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
    }

    @Test
    void pricing_rejectsMissingPartId() throws Exception {
        mvc.perform(post("/api/parts/pricing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"quantity\":2}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1000));
    }

    // ---------------------------------------------------------------------
    // API catalog và kho
    // ---------------------------------------------------------------------

    @Test
    void searchUsesDefaultPaginationAndSorting() throws Exception {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        given(partService.searchParts(null, null, null, null, null, null, false, null, null, pageable))
                .willReturn(new PageResponse<>(List.of(), 0, 20, 0, 0, false, false));

        mvc.perform(get("/api/parts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.result.items").isEmpty())
                .andExpect(jsonPath("$.result.size").value(20));
    }

    @Test
    void getPartReturnsPartDetail() throws Exception {
        given(partService.getPartById(PART_ID)).willReturn(partResponse());

        mvc.perform(get("/api/parts/{partId}", PART_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.id").value(PART_ID.toString()))
                .andExpect(jsonPath("$.result.sku").value("SKU-001"));
    }

    @Test
    void reserveReturnsLedgerRows() throws Exception {
        given(stockService.reserve(any())).willReturn(List.of(
                new InventoryTransactionResponse(UUID.randomUUID(), PART_ID, "SKU-001", "Dầu nhớt",
                        com.example.inventory_service.enums.TransactionType.RESERVE, 3, 2, 5,
                        com.example.inventory_service.enums.ReferenceType.WORK_ORDER,
                        UUID.randomUUID(), UUID.randomUUID(), null, null)));

        mvc.perform(post("/api/parts/reserve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"referenceId\":\"" + UUID.randomUUID() + "\","
                                + "\"items\":[{\"partId\":\"" + PART_ID + "\",\"quantity\":3}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].type").value("RESERVE"))
                .andExpect(jsonPath("$.result[0].stockBefore").value(2))
                .andExpect(jsonPath("$.result[0].stockAfter").value(5));
    }

    @Test
    void deletePartEndpointReturnsNoContent() throws Exception {
        mvc.perform(delete("/api/parts/{partId}", PART_ID))
                .andExpect(status().isNoContent());

        verify(partService).deletePart(PART_ID);
    }

    @Test
    void addCompatibilityReturnsCreated() throws Exception {
        UUID compatibilityId = UUID.randomUUID();
        given(partService.addCompatibility(eq(PART_ID), any()))
                .willReturn(new PartCompatibilityResponse(compatibilityId, PART_ID,
                        "Honda", "Accord", (short) 2018, (short) 2024, null));

        mvc.perform(post("/api/parts/{partId}/compatibilities", PART_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vehicleBrand\":\"Honda\",\"vehicleModel\":\"Accord\","
                                + "\"yearFrom\":2018,\"yearTo\":2024}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.vehicleBrand").value("Honda"));
    }

    private PartResponse partResponse() {
        return new PartResponse(PART_ID, UUID.randomUUID(), "Dầu nhớt", "SKU-001", null,
                "Dầu nhớt 5W-30", null, "LÍT", BigDecimal.valueOf(50), BigDecimal.valueOf(150),
                10, 4, 6, 5, true, null, null);
    }
}
