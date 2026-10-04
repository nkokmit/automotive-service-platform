package com.example.user_service.service;

import com.example.user_service.dto.request.RoleCreateRequest;
import com.example.user_service.dto.request.RoleUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.RoleResponse;
import com.example.user_service.entity.Permission;
import com.example.user_service.entity.Role;
import com.example.user_service.exception.PermissionNotFoundException;
import com.example.user_service.exception.RoleAlreadyExistsException;
import com.example.user_service.exception.RoleNotFoundException;
import com.example.user_service.mapper.EntityMapper;
import com.example.user_service.repository.PermissionRepository;
import com.example.user_service.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RoleServiceImpl implements RoleService {

    /**
     * Prefix bắt buộc cho {@code roles.name} trong DB, theo convention của Spring Security
     * ({@code hasRole("ADMIN")} tương ứng authority {@code ROLE_ADMIN}). Được thêm tự động
     * bởi {@link #normalizeRoleName(String)} — client không cần (và sẽ bị reject nếu) gửi kèm.
     */
    static final String ROLE_PREFIX = "ROLE_";

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final EntityMapper entityMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<RoleResponse> getAllRoles(Pageable pageable) {
        Page<Role> page = roleRepository.findAll(pageable);
        return PageResponse.from(page, entityMapper::toRoleResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RoleNotFoundException("Không tìm thấy role với id: " + id));
        return entityMapper.toRoleResponse(role);
    }

    @Override
    public RoleResponse createRole(RoleCreateRequest request) {
        String normalizedName = normalizeRoleName(request.name());
        if (roleRepository.existsByName(normalizedName)) {
            throw new RoleAlreadyExistsException("Role đã tồn tại: " + normalizedName);
        }
        Role role = Role.builder()
                .name(normalizedName)
                .displayName(request.displayName())
                .description(request.description())
                .build();
        Role saved = roleRepository.save(role);
        log.info("Đã tạo role mới: {}", saved.getName());
        return entityMapper.toRoleResponse(saved);
    }

    @Override
    public RoleResponse updateRole(UUID id, RoleUpdateRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RoleNotFoundException("Không tìm thấy role với id: " + id));

        if (request.name() != null && !request.name().isBlank()) {
            String normalizedName = normalizeRoleName(request.name());
            if (!normalizedName.equals(role.getName()) && roleRepository.existsByName(normalizedName)) {
                throw new RoleAlreadyExistsException("Role đã tồn tại: " + normalizedName);
            }
            role.setName(normalizedName);
        }
        if (request.displayName() != null) {
            role.setDisplayName(request.displayName());
        }
        if (request.description() != null) {
            role.setDescription(request.description());
        }

        Role saved = roleRepository.save(role);
        log.info("Đã cập nhật role: {}", saved.getName());
        return entityMapper.toRoleResponse(saved);
    }

    @Override
    public void deleteRole(UUID id) {
        // Native query để bypass @SQLRestriction — idempotent nếu role đã bị xoá trước đó.
        Role role = roleRepository.findByIdRaw(id)
                .orElseThrow(() -> new RoleNotFoundException("Không tìm thấy role với id: " + id));

        if (role.getDeletedAt() != null) {
            log.info("Role {} đã được xoá trước đó — bỏ qua (idempotent)", id);
            return;
        }
        role.setDeletedAt(Instant.now());
        roleRepository.save(role);
        log.info("Đã soft delete role: {}", id);
    }

    @Override
    public RoleResponse assignPermissions(UUID roleId, Set<UUID> permissionIds) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RoleNotFoundException("Không tìm thấy role với id: " + roleId));
        role.setPermissions(resolvePermissions(permissionIds));
        Role saved = roleRepository.save(role);
        log.info("Đã gán {} permissions cho role {}", permissionIds.size(), roleId);
        return entityMapper.toRoleResponse(saved);
    }

    @Override
    public RoleResponse removePermission(UUID roleId, UUID permissionId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RoleNotFoundException("Không tìm thấy role với id: " + roleId));

        boolean removed = role.getPermissions().removeIf(p -> p.getId().equals(permissionId));
        if (!removed) {
            throw new PermissionNotFoundException("Role không có permission với id: " + permissionId);
        }
        Role saved = roleRepository.save(role);
        log.info("Đã gỡ permission {} khỏi role {}", permissionId, roleId);
        return entityMapper.toRoleResponse(saved);
    }

    private Set<Permission> resolvePermissions(Set<UUID> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return new HashSet<>();
        }
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        if (permissions.size() != permissionIds.size()) {
            Set<UUID> foundIds = permissions.stream().map(Permission::getId).collect(Collectors.toSet());
            List<UUID> missing = permissionIds.stream().filter(pid -> !foundIds.contains(pid)).toList();
            throw new PermissionNotFoundException("Không tìm thấy permission id: " + missing);
        }
        return new HashSet<>(permissions);
    }

    /**
     * Chuẩn hoá role name: tự động thêm prefix {@code ROLE_} nếu client chưa gửi.
     * Input hợp lệ đã được {@link RoleCreateRequest} / {@link RoleUpdateRequest} ràng buộc
     * ở dạng UPPER_SNAKE_CASE; gọi hàm này từ service là nguồn sự thật duy nhất tạo tên
     * cuối cùng trong DB — phù hợp với convention {@code hasRole(...)} của Spring Security.
     */
    private String normalizeRoleName(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Role name không được null");
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith(ROLE_PREFIX)) {
            return trimmed;
        }
        return ROLE_PREFIX + trimmed;
    }
}


