package com.example.user_service.controller;

import com.example.user_service.common.ApiResponse;
import com.example.user_service.dto.request.RoleCreateRequest;
import com.example.user_service.dto.request.RoleUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.RoleResponse;
import com.example.user_service.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

/**
 * CRUD API cho Role. Controller mỏng — chỉ validate request và gọi service.
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ApiResponse<PageResponse<RoleResponse>> getAllRoles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(roleService.getAllRoles(pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<RoleResponse> getRoleById(@PathVariable UUID id) {
        return ApiResponse.success(roleService.getRoleById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RoleResponse> createRole(@Valid @RequestBody RoleCreateRequest request) {
        return ApiResponse.success("Tạo role thành công", roleService.createRole(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<RoleResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody RoleUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật role thành công", roleService.updateRole(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable UUID id) {
        roleService.deleteRole(id);
    }

    @PostMapping("/{id}/permissions")
    public ApiResponse<RoleResponse> assignPermissions(
            @PathVariable UUID id,
            @RequestBody Set<UUID> permissionIds
    ) {
        return ApiResponse.success("Gán permission thành công", roleService.assignPermissions(id, permissionIds));
    }

    @DeleteMapping("/{id}/permissions/{permissionId}")
    public ApiResponse<RoleResponse> removePermission(
            @PathVariable UUID id,
            @PathVariable UUID permissionId
    ) {
        return ApiResponse.success("Gỡ permission thành công", roleService.removePermission(id, permissionId));
    }
}
