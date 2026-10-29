package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.entity.InventoryTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface InventoryTransactionMapper {

    @Mapping(target = "partId", source = "part.id")
    @Mapping(target = "partSku", source = "part.sku")
    @Mapping(target = "partName", source = "part.name")
    InventoryTransactionResponse toResponse(InventoryTransaction transaction);
}
