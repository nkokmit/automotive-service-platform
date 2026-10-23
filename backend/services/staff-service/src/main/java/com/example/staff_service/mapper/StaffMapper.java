package com.example.staff_service.mapper;

import com.example.staff_service.dto.response.StaffResponse;
import com.example.staff_service.entity.StaffMember;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface StaffMapper {

    StaffResponse toStaffResponse(StaffMember staffMember);
}
