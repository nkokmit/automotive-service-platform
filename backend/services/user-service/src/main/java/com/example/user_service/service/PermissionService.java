package com.example.user_service.service;

import com.example.user_service.dto.request.PermissionCreateRequest;
import com.example.user_service.dto.request.PermissionUpdateRequest;
import com.example.user_service.dto.response.PageResponse;
import com.example.user_service.dto.response.PermissionResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PermissionService {

    /**
     * Phân trang permission chưa bị soft delete.
     */
    PageResponse<PermissionResponse> getAllPermissions(Pageable pageable);

    /**
     * Lấy permission theo ID. Trả exception nếu không tồn tại hoặc đã bị xoá.
     */
    PermissionResponse getPermissionById(UUID id);

    /**
     * Tạo permission mới.
     */
    PermissionResponse createPermission(PermissionCreateRequest request);

    /**
     * Cập nhật permission. Các trường null trong request sẽ giữ nguyên giá trị cũ.
     */
    PermissionResponse updatePermission(UUID id, PermissionUpdateRequest request);

    /**
     * Soft delete permission (set deleted_at). Idempotent nếu gọi nhiều lần.
     */
    void deletePermission(UUID id);
}
