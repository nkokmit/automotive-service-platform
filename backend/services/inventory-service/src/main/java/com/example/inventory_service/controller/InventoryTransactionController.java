package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.service.InventoryTransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Sổ nhật ký kho", description = "Tra cứu mọi biến động tồn kho để audit")
public class InventoryTransactionController {

    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "type", "quantity");

    private final InventoryTransactionService inventoryTransactionService;

    @GetMapping
    @PreAuthorize("hasAuthority('INVENTORY_TRANSACTION_READ')")
    @Operation(summary = "Tra cứu sổ nhật ký kho",
            description = "Lọc theo phụ tùng, loại giao dịch, loại tham chiếu, mã tham chiếu "
                    + "và khoảng thời gian. Mọi biến động tồn kho đều có bản ghi tại đây.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả sổ nhật ký kho.")
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
