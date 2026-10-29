package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.PartCompatibilityRequest;
import com.example.inventory_service.dto.request.PartRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.dto.response.PartCompatibilityResponse;
import com.example.inventory_service.dto.response.PartResponse;
import com.example.inventory_service.service.PartService;
import com.example.inventory_service.service.StockService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/parts")
@RequiredArgsConstructor
@Validated
public class PartController {

    private static final Set<String> SORT_FIELDS =
            Set.of("sku", "name", "brand", "sellingPrice", "onHandStock", "createdAt");

    private final PartService partService;
    private final StockService stockService;

    @GetMapping
    @PreAuthorize("hasAuthority('PART_READ')")
    public ApiResponse<PageResponse<PartResponse>> searchParts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String oemCode,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "false") boolean lowStockOnly,
            @RequestParam(required = false) String vehicleBrand,
            @RequestParam(required = false) String vehicleModel,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(partService.searchParts(keyword, sku, oemCode, brand, categoryId,
                isActive, lowStockOnly, vehicleBrand, vehicleModel,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{partId}")
    @PreAuthorize("hasAuthority('PART_READ')")
    public ApiResponse<PartResponse> getPart(@PathVariable UUID partId) {
        return ApiResponse.success(partService.getPartById(partId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public ApiResponse<PartResponse> createPart(@Valid @RequestBody PartRequest request) {
        return ApiResponse.success("Tạo phụ tùng thành công", partService.createPart(request));
    }

    @PutMapping("/{partId}")
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public ApiResponse<PartResponse> updatePart(@PathVariable UUID partId,
                                                @Valid @RequestBody PartRequest request) {
        return ApiResponse.success("Cập nhật phụ tùng thành công", partService.updatePart(partId, request));
    }

    @DeleteMapping("/{partId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public void deletePart(@PathVariable UUID partId) {
        partService.deletePart(partId);
    }

    @GetMapping("/{partId}/compatibilities")
    @PreAuthorize("hasAuthority('PART_READ')")
    public ApiResponse<List<PartCompatibilityResponse>> getCompatibilities(@PathVariable UUID partId) {
        return ApiResponse.success(partService.getCompatibilities(partId));
    }

    @PostMapping("/{partId}/compatibilities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public ApiResponse<PartCompatibilityResponse> addCompatibility(
            @PathVariable UUID partId,
            @Valid @RequestBody PartCompatibilityRequest request) {
        return ApiResponse.success("Thêm dòng xe tương thích thành công",
                partService.addCompatibility(partId, request));
    }

    @DeleteMapping("/{partId}/compatibilities/{compatibilityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public void deleteCompatibility(@PathVariable UUID partId, @PathVariable UUID compatibilityId) {
        partService.deleteCompatibility(partId, compatibilityId);
    }

    @PostMapping("/reserve")
    @PreAuthorize("hasAuthority('STOCK_WRITE')")
    public ApiResponse<List<InventoryTransactionResponse>> reserve(
            @Valid @RequestBody StockOperationRequest request) {
        return ApiResponse.success("Giữ chỗ tồn kho thành công", stockService.reserve(request));
    }

    @PostMapping("/issue")
    @PreAuthorize("hasAuthority('STOCK_WRITE')")
    public ApiResponse<List<InventoryTransactionResponse>> issue(
            @Valid @RequestBody StockOperationRequest request) {
        return ApiResponse.success("Xuất kho thành công", stockService.issue(request));
    }

    @PostMapping("/release")
    @PreAuthorize("hasAuthority('STOCK_WRITE')")
    public ApiResponse<List<InventoryTransactionResponse>> release(
            @Valid @RequestBody StockOperationRequest request) {
        return ApiResponse.success("Giải phóng giữ chỗ thành công", stockService.release(request));
    }
}
