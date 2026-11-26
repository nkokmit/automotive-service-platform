/**
 * Endpoint client cho phần **PERMISSIONS & ROLES MANAGEMENT** (user-service).
 *
 * Nguồn: `user-service/PermissionController` + `user-service/RoleController`.
 *
 * Yêu cầu authority:
 *  - `PERMISSION_READ`  → GET /api/permissions, GET /api/permissions/{id}
 *  - `PERMISSION_WRITE` → POST/PUT/DELETE /api/permissions[/{id}]
 *  - `ROLE_READ`        → GET /api/roles, GET /api/roles/{id}
 *  - `ROLE_WRITE`       → POST/PUT/DELETE /api/roles[/{id}], gán/gỡ permission
 *
 * Lưu ý hợp đồng quan trọng:
 *  1. `POST /api/roles/{id}/permissions` nhận body là **mảng UUID thuần**
 *     (`Set<UUID>`), KHÔNG phải object `{ permissionIds: [...] }`.
 *  2. `POST /api/users/{id}/roles` cũng nhận mảng UUID thuần.
 *  3. Tên role gửi lên KHÔNG có prefix `ROLE_`; tên permission gửi lên KHÔNG có
 *     prefix `PERMISSION_` — backend tự thêm prefix khi dựng authority.
 *  4. Xoá role / permission là **soft delete** (HTTP 204, body rỗng).
 */
import client from "../client";
import type {
  PageResponse,
  PermissionCreateRequest,
  PermissionResponse,
  PermissionUpdateRequest,
  RoleCreateRequest,
  RoleResponse,
  RoleUpdateRequest,
  UserResponse,
} from "../types";

export interface ListRbacParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

// =========================
// Permissions
// =========================

export const permissionApi = {
  /** Danh sách quyền. Trang 0-based. Cần authority `PERMISSION_READ`. */
  listPermissions: async (
    params: ListRbacParams = {},
  ): Promise<PageResponse<PermissionResponse>> => {
    return client.requestPage<PageResponse<PermissionResponse>>(
      "/api/permissions",
      {
        page: params.page ?? 0,
        size: params.size ?? 100,
        sortBy: params.sortBy ?? "name",
        sortDirection: params.sortDirection ?? "ASC",
      },
    );
  },

  /** Chi tiết một quyền. Cần authority `PERMISSION_READ`. */
  getPermission: async (id: string): Promise<PermissionResponse> => {
    return client.request<PermissionResponse>(`/api/permissions/${id}`);
  },

  /** Tạo quyền mới. Cần authority `PERMISSION_WRITE`. */
  createPermission: async (
    data: PermissionCreateRequest,
  ): Promise<PermissionResponse> => {
    return client.request<PermissionResponse>("/api/permissions", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật quyền. Cần authority `PERMISSION_WRITE`. */
  updatePermission: async (
    id: string,
    data: PermissionUpdateRequest,
  ): Promise<PermissionResponse> => {
    return client.request<PermissionResponse>(`/api/permissions/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Xoá quyền (soft delete → HTTP 204). Cần authority `PERMISSION_WRITE`. */
  deletePermission: async (id: string): Promise<void> => {
    await client.request<void>(`/api/permissions/${id}`, { method: "DELETE" });
  },
};

// =========================
// Roles
// =========================

export const roleApi = {
  /** Danh sách vai trò. Trang 0-based. Cần authority `ROLE_READ`. */
  listRoles: async (
    params: ListRbacParams = {},
  ): Promise<PageResponse<RoleResponse>> => {
    return client.requestPage<PageResponse<RoleResponse>>("/api/roles", {
      page: params.page ?? 0,
      size: params.size ?? 100,
      sortBy: params.sortBy ?? "name",
      sortDirection: params.sortDirection ?? "ASC",
    });
  },

  /** Chi tiết một vai trò (kèm danh sách permission đã gán). Cần `ROLE_READ`. */
  getRole: async (id: string): Promise<RoleResponse> => {
    return client.request<RoleResponse>(`/api/roles/${id}`);
  },

  /** Tạo vai trò mới. Cần authority `ROLE_WRITE`. */
  createRole: async (data: RoleCreateRequest): Promise<RoleResponse> => {
    return client.request<RoleResponse>("/api/roles", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật vai trò. Cần authority `ROLE_WRITE`. */
  updateRole: async (
    id: string,
    data: RoleUpdateRequest,
  ): Promise<RoleResponse> => {
    return client.request<RoleResponse>(`/api/roles/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Xoá vai trò (soft delete → HTTP 204). Cần authority `ROLE_WRITE`. */
  deleteRole: async (id: string): Promise<void> => {
    await client.request<void>(`/api/roles/${id}`, { method: "DELETE" });
  },

  /**
   * Gán permission cho vai trò — **thay thế toàn bộ** tập permission hiện có.
   *
   * Body là mảng UUID thuần (`Set<UUID>`), không phải object.
   * Cần authority `ROLE_WRITE`.
   */
  assignPermissions: async (
    roleId: string,
    permissionIds: string[],
  ): Promise<RoleResponse> => {
    return client.request<RoleResponse>(`/api/roles/${roleId}/permissions`, {
      method: "POST",
      body: permissionIds,
    });
  },

  /** Gỡ một permission khỏi vai trò. Cần authority `ROLE_WRITE`. */
  removePermission: async (
    roleId: string,
    permissionId: string,
  ): Promise<RoleResponse> => {
    return client.request<RoleResponse>(
      `/api/roles/${roleId}/permissions/${permissionId}`,
      { method: "DELETE" },
    );
  },
};

// =========================
// Gán / gỡ role cho user
// =========================

export const userRoleApi = {
  /**
   * Gán role cho user — **thay thế toàn bộ** tập role hiện có.
   *
   * Body là mảng UUID thuần (`Set<UUID>`). Cần authority `USER_UPDATE`.
   */
  assignRoles: async (
    userId: string,
    roleIds: string[],
  ): Promise<UserResponse> => {
    return client.request<UserResponse>(`/api/users/${userId}/roles`, {
      method: "POST",
      body: roleIds,
    });
  },

  /** Gỡ một role khỏi user. Cần authority `USER_UPDATE`. */
  removeRole: async (
    userId: string,
    roleId: string,
  ): Promise<UserResponse> => {
    return client.request<UserResponse>(`/api/users/${userId}/roles/${roleId}`, {
      method: "DELETE",
    });
  },
};
