package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.dto.request.InternalPartStockCommand;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.service.InternalPartStockCommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/parts")
@RequiredArgsConstructor
public class InternalPartStockController {

    private final InternalPartStockCommandService commandService;

    @PostMapping("/issue")
    @PreAuthorize("hasAuthority('INTERNAL_PART_STOCK_WRITE')")
    public ApiResponse<InventoryTransactionResponse> issue(
            @Valid @RequestBody InternalPartStockCommand command
    ) {
        return ApiResponse.success("Xuất phụ tùng đã reserve thành công",
                commandService.issue(command));
    }

    @PostMapping("/release")
    @PreAuthorize("hasAuthority('INTERNAL_PART_STOCK_WRITE')")
    public ApiResponse<InventoryTransactionResponse> release(
            @Valid @RequestBody InternalPartStockCommand command
    ) {
        return ApiResponse.success("Giải phóng phụ tùng đã reserve thành công",
                commandService.release(command));
    }
}
