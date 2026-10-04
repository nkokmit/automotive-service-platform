package com.example.user_service.controller;

import com.example.user_service.common.ApiResponse;
import com.example.user_service.dto.request.PermissionCreateRequest;
import com.example.user_service.dto.request.PermissionUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.PermissionResponse;
import com.example.user_service.service.PermissionService;
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

import java.util.UUID;

/**
 * CRUD API cho Permission. Controller mỏng — chỉ validate request và gọi service.
 */
@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    public ApiResponse<PageResponse<PermissionResponse>> getAllPermissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(permissionService.getAllPermissions(pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<PermissionResponse> getPermissionById(@PathVariable UUID id) {
        return ApiResponse.success(permissionService.getPermissionById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PermissionResponse> createPermission(
            @Valid @RequestBody PermissionCreateRequest request
    ) {
        return ApiResponse.success("Tạo permission thành công", permissionService.createPermission(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<PermissionResponse> updatePermission(
            @PathVariable UUID id,
            @Valid @RequestBody PermissionUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật permission thành công", permissionService.updatePermission(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermission(@PathVariable UUID id) {
        permissionService.deletePermission(id);
    }
}
