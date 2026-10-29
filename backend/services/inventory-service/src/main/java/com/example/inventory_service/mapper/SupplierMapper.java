package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.SupplierResponse;
import com.example.inventory_service.entity.Supplier;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface SupplierMapper {

    SupplierResponse toResponse(Supplier supplier);
}
