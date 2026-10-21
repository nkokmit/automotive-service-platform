package com.example.user_service.service;

import com.example.user_service.dto.request.RoleCreateRequest;
import com.example.user_service.dto.request.RoleUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.RoleResponse;
import org.springframework.data.domain.Pageable;

import java.util.Set;
import java.util.UUID;

public interface RoleService {

    PageResponse<RoleResponse> getAllRoles(Pageable pageable);

    RoleResponse getRoleById(UUID id);

    RoleResponse createRole(RoleCreateRequest request);

    RoleResponse updateRole(UUID id, RoleUpdateRequest request);

    void deleteRole(UUID id);

    RoleResponse assignPermissions(UUID roleId, Set<UUID> permissionIds);

    RoleResponse removePermission(UUID roleId, UUID permissionId);
}
