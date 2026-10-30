package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.ServiceBomResponse;
import com.example.inventory_service.entity.ServiceBom;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface ServiceBomMapper {

    @Mapping(target = "serviceId", source = "service.id")
    @Mapping(target = "partId", source = "part.id")
    @Mapping(target = "partSku", source = "part.sku")
    @Mapping(target = "partName", source = "part.name")
    @Mapping(target = "partUnit", source = "part.unit")
    ServiceBomResponse toResponse(ServiceBom bom);
}
