package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.TextUtils;
import com.example.inventory_service.dto.request.SupplierRequest;
import com.example.inventory_service.dto.response.SupplierResponse;
import com.example.inventory_service.entity.Supplier;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.SupplierAlreadyExistsException;
import com.example.inventory_service.exception.SupplierNotFoundException;
import com.example.inventory_service.mapper.SupplierMapper;
import com.example.inventory_service.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierMapper supplierMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> getSuppliers(String keyword, Boolean isActive, Pageable pageable) {
        return PageResponse.from(
                supplierRepository.search(TextUtils.trimToNull(keyword), isActive, pageable),
                supplierMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierResponse getSupplierById(UUID id) {
        return supplierMapper.toResponse(findSupplier(id));
    }

    @Override
    public SupplierResponse createSupplier(SupplierRequest request) {
        String code = request.code().trim();
        if (supplierRepository.existsByCodeIgnoreCase(code)) {
            throw new SupplierAlreadyExistsException("Mã nhà cung cấp đã tồn tại: " + code);
        }
        Supplier saved = supplierRepository.save(Supplier.builder()
                .code(code)
                .name(request.name().trim())
                .taxCode(TextUtils.trimToNull(request.taxCode()))
                .phone(request.phone().trim())
                .email(TextUtils.trimToNull(request.email()))
                .address(TextUtils.trimToNull(request.address()))
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build());
        log.info("Đã tạo nhà cung cấp: code={}", saved.getCode());
        return supplierMapper.toResponse(saved);
    }

    @Override
    public SupplierResponse updateSupplier(UUID id, SupplierRequest request) {
        Supplier supplier = findSupplier(id);
        String code = request.code().trim();
        if (supplierRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new SupplierAlreadyExistsException("Mã nhà cung cấp đã tồn tại: " + code);
        }
        supplier.setCode(code);
        supplier.setName(request.name().trim());
        supplier.setTaxCode(TextUtils.trimToNull(request.taxCode()));
        supplier.setPhone(request.phone().trim());
        supplier.setEmail(TextUtils.trimToNull(request.email()));
        supplier.setAddress(TextUtils.trimToNull(request.address()));
        if (request.isActive() != null) {
            supplier.setIsActive(request.isActive());
        }
        Supplier saved = supplierRepository.save(supplier);
        log.info("Đã cập nhật nhà cung cấp: id={}", saved.getId());
        return supplierMapper.toResponse(saved);
    }

    @Override
    public void deleteSupplier(UUID id) {
        Supplier supplier = findSupplier(id);
        if (supplierRepository.countPurchaseOrdersBySupplierId(id) > 0) {
            throw new ApiException(ErrorCode.SUPPLIER_IN_USE,
                    "Nhà cung cấp đã có đơn nhập hàng; hãy đặt isActive=false thay vì xóa");
        }
        supplier.setIsActive(Boolean.FALSE);
        supplierRepository.save(supplier);
        log.info("Đã vô hiệu hóa nhà cung cấp: id={}", id);
    }

    private Supplier findSupplier(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new SupplierNotFoundException("Không tìm thấy nhà cung cấp với id: " + id));
    }
}
