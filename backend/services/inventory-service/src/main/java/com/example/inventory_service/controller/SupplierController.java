package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.SupplierRequest;
import com.example.inventory_service.dto.response.SupplierResponse;
import com.example.inventory_service.service.SupplierService;
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

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@Validated
public class SupplierController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "name", "createdAt");

    private final SupplierService supplierService;

    @GetMapping
    @PreAuthorize("hasAuthority('SUPPLIER_READ')")
    public ApiResponse<PageResponse<SupplierResponse>> getSuppliers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(supplierService.getSuppliers(keyword, isActive,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{supplierId}")
    @PreAuthorize("hasAuthority('SUPPLIER_READ')")
    public ApiResponse<SupplierResponse> getSupplier(@PathVariable UUID supplierId) {
        return ApiResponse.success(supplierService.getSupplierById(supplierId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SUPPLIER_WRITE')")
    public ApiResponse<SupplierResponse> createSupplier(@Valid @RequestBody SupplierRequest request) {
        return ApiResponse.success("Tạo nhà cung cấp thành công", supplierService.createSupplier(request));
    }

    @PutMapping("/{supplierId}")
    @PreAuthorize("hasAuthority('SUPPLIER_WRITE')")
    public ApiResponse<SupplierResponse> updateSupplier(@PathVariable UUID supplierId,
                                                        @Valid @RequestBody SupplierRequest request) {
        return ApiResponse.success("Cập nhật nhà cung cấp thành công",
                supplierService.updateSupplier(supplierId, request));
    }

    @DeleteMapping("/{supplierId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SUPPLIER_WRITE')")
    public void deleteSupplier(@PathVariable UUID supplierId) {
        supplierService.deleteSupplier(supplierId);
    }
}
