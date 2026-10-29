package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.CategoryResponse;
import com.example.inventory_service.entity.PartCategory;
import com.example.inventory_service.entity.ServiceCategory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface CategoryMapper {

    CategoryResponse toResponse(ServiceCategory category);

    CategoryResponse toResponse(PartCategory category);
}
