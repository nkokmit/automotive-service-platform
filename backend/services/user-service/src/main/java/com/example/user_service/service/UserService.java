package com.example.user_service.service;

import com.example.user_service.dto.request.UserCreateRequest;
import com.example.user_service.dto.request.UserUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.UserResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserService {

    /**
     * Phân trang user chưa bị soft delete.
     */
    PageResponse<UserResponse> getAllUsers(Pageable pageable);

    /**
     * Lấy user theo ID. Trả exception nếu không tồn tại hoặc đã bị xoá.
     */
    UserResponse getUserById(UUID id);

    /**
     * Tạo user mới.
     *
     * @throws com.example.user_service.exception.UserAlreadyExistsException nếu username/email đã tồn tại
     */
    UserResponse createUser(UserCreateRequest request);

    /**
     * Cập nhật user. Các trường null trong request sẽ giữ nguyên giá trị cũ.
     */
    UserResponse updateUser(UUID id, UserUpdateRequest request);

    /**
     * Soft delete user (set deleted_at).
     */
    void deleteUser(UUID id);

    /**
     * Gán role cho user (thay thế toàn bộ role hiện tại).
     */
    UserResponse assignRoles(UUID userId, java.util.Set<UUID> roleIds);

    /**
     * Gỡ một role khỏi user.
     */
    UserResponse removeRole(UUID userId, UUID roleId);
}
