package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.PartResponse;
import com.example.inventory_service.entity.Part;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface PartMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "availableStock",
            expression = "java(part.getOnHandStock() - part.getReservedStock())")
    PartResponse toResponse(Part part);
}
