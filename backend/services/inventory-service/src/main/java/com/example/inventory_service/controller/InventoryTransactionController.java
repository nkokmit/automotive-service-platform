package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.service.InventoryTransactionService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory-transactions")
@RequiredArgsConstructor
@Validated
public class InventoryTransactionController {

    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "type", "quantity");

    private final InventoryTransactionService inventoryTransactionService;

    @GetMapping
    @PreAuthorize("hasAuthority('INVENTORY_TRANSACTION_READ')")
    public ApiResponse<PageResponse<InventoryTransactionResponse>> getTransactions(
            @RequestParam(required = false) UUID partId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) ReferenceType referenceType,
            @RequestParam(required = false) UUID referenceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(inventoryTransactionService.getTransactions(
                partId, type, referenceType, referenceId, fromDate, toDate,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }
}
