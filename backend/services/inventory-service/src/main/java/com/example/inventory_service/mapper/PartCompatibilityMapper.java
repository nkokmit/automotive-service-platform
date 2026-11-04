package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.PartCompatibilityResponse;
import com.example.inventory_service.entity.PartVehicleCompatibility;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface PartCompatibilityMapper {

    @Mapping(target = "partId", source = "part.id")
    PartCompatibilityResponse toResponse(PartVehicleCompatibility compatibility);
}
