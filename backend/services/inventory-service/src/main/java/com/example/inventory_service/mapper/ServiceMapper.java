package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.ServiceResponse;
import com.example.inventory_service.entity.Service;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface ServiceMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    ServiceResponse toResponse(Service service);
}
