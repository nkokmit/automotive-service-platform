package com.example.staff_service.mapper;

import com.example.staff_service.dto.response.WorkShiftResponse;
import com.example.staff_service.entity.WorkShift;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface WorkShiftMapper {

    WorkShiftResponse toWorkShiftResponse(WorkShift workShift);
}
