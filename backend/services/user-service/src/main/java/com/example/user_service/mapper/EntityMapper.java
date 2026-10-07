package com.example.user_service.mapper;

import com.example.user_service.dto.response.PermissionResponse;
import com.example.user_service.dto.response.RoleResponse;
import com.example.user_service.dto.response.UserResponse;
import com.example.user_service.entity.Permission;
import com.example.user_service.entity.Role;
import com.example.user_service.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * MapStruct mapper cho Entity ↔ DTO.
 *
 * <p>Sử dụng MapStruct thay cho mapper thủ công để giảm boilerplate và tăng hiệu năng
 * (MapStruct sinh code mapping tại compile-time, không dùng reflection).
 *
 * <p>Quy ước:
 * <ul>
 *   <li>{@link UserResponse} chỉ chứa {@link RoleResponse} rút gọn (không kèm permissions)
 *       để tránh đệ quy vô hạn.</li>
 *   <li>{@link RoleResponse} đầy đủ trả về kèm {@link PermissionResponse}.</li>
 * </ul>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface EntityMapper {

    @Mapping(target = "roles", expression = "java(mapRolesSummary(user))")
    UserResponse toUserResponse(User user);

    @Mapping(target = "permissions", expression = "java(mapPermissions(role))")
    RoleResponse toRoleResponse(Role role);

    /**
     * Map Role sang RoleResponse rút gọn (không kèm permissions) — dùng khi embed vào UserResponse.
     */
    PermissionResponse toPermissionResponse(Permission permission);

    default Set<RoleResponse> mapRolesSummary(User user) {
        if (user == null || user.getRoles() == null) {
            return Set.of();
        }
        return user.getRoles().stream()
                .map(this::toRoleSummary)
                .collect(Collectors.toSet());
    }

    default Set<PermissionResponse> mapPermissions(Role role) {
        if (role == null || role.getPermissions() == null) {
            return Set.of();
        }
        return role.getPermissions().stream()
                .map(this::toPermissionResponse)
                .collect(Collectors.toSet());
    }

    /**
     * Helper rút gọn — không bao gồm permissions để tránh đệ quy.
     */
    default RoleResponse toRoleSummary(Role role) {
        if (role == null) return null;
        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDisplayName(),
                role.getDescription(),
                null
        );
    }
}

