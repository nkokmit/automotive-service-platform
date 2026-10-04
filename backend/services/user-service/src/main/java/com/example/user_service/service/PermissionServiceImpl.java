package com.example.user_service.service;

import com.example.user_service.dto.request.PermissionCreateRequest;
import com.example.user_service.dto.request.PermissionUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.PermissionResponse;
import com.example.user_service.entity.Permission;
import com.example.user_service.exception.PermissionAlreadyExistsException;
import com.example.user_service.exception.PermissionNotFoundException;
import com.example.user_service.mapper.EntityMapper;
import com.example.user_service.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final EntityMapper entityMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PermissionResponse> getAllPermissions(Pageable pageable) {
        Page<Permission> page = permissionRepository.findAll(pageable);
        return PageResponse.from(page, entityMapper::toPermissionResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(UUID id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new PermissionNotFoundException("Không tìm thấy permission với id: " + id));
        return entityMapper.toPermissionResponse(permission);
    }

    @Override
    public PermissionResponse createPermission(PermissionCreateRequest request) {
        if (permissionRepository.existsByName(request.name())) {
            throw new PermissionAlreadyExistsException("Permission đã tồn tại: " + request.name());
        }
        Permission permission = Permission.builder()
                .name(request.name())
                .displayName(request.displayName())
                .description(request.description())
                .build();
        Permission saved = permissionRepository.save(permission);
        log.info("Đã tạo permission mới: {}", saved.getName());
        return entityMapper.toPermissionResponse(saved);
    }

    @Override
    public PermissionResponse updatePermission(UUID id, PermissionUpdateRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new PermissionNotFoundException("Không tìm thấy permission với id: " + id));

        if (request.name() != null && !request.name().equals(permission.getName())) {
            if (permissionRepository.existsByName(request.name())) {
                throw new PermissionAlreadyExistsException("Permission đã tồn tại: " + request.name());
            }
            permission.setName(request.name());
        }
        if (request.displayName() != null) {
            permission.setDisplayName(request.displayName());
        }
        if (request.description() != null) {
            permission.setDescription(request.description());
        }

        Permission saved = permissionRepository.save(permission);
        log.info("Đã cập nhật permission: {}", saved.getName());
        return entityMapper.toPermissionResponse(saved);
    }

    @Override
    public void deletePermission(UUID id) {
        // Native query để bypass @SQLRestriction — idempotent nếu permission đã bị xoá trước đó.
        Permission permission = permissionRepository.findByIdRaw(id)
                .orElseThrow(() -> new PermissionNotFoundException("Không tìm thấy permission với id: " + id));

        if (permission.getDeletedAt() != null) {
            log.info("Permission {} đã được xoá trước đó — bỏ qua (idempotent)", id);
            return;
        }
        permission.setDeletedAt(Instant.now());
        permissionRepository.save(permission);
        log.info("Đã soft delete permission: {}", id);
    }
}
