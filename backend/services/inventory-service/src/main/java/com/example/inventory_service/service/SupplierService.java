package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.request.SupplierRequest;
import com.example.inventory_service.dto.response.SupplierResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SupplierService {

    PageResponse<SupplierResponse> getSuppliers(String keyword, Boolean isActive, Pageable pageable);

    SupplierResponse getSupplierById(UUID id);

    SupplierResponse createSupplier(SupplierRequest request);

    SupplierResponse updateSupplier(UUID id, SupplierRequest request);

    /**
     * Xóa mềm ({@code isActive=false}). Chặn khi nhà cung cấp còn đơn nhập hàng.
     */
    void deleteSupplier(UUID id);
}
