/**
 * Endpoint cho user-service & customer-vehicle-service.
 */
import client from "../client";
import type {
  CustomerResponse,
  PageResponse,
  RoleResponse,
  UserResponse,
  UserUpdateRequest,
} from "../types";
import { customerVehicleApi } from "./customerVehicle";

export const userApi = {
  me: (): Promise<UserResponse> => client.request<UserResponse>("/api/users/me"),

  /**
   * Cập nhật hồ sơ người dùng — `PUT /api/users/{id}`.
   * Cần authority `USER_UPDATE` (hiện chỉ ADMIN/MANAGER có) → khách hàng
   * thường sẽ nhận 403, component cần có fallback cục bộ.
   */
  updateUser: (id: string, data: UserUpdateRequest): Promise<UserResponse> =>
    client.request<UserResponse>(`/api/users/${id}`, {
      method: "PUT",
      body: data,
    }),
};

export const customerApi = {
  me: (signal?: AbortSignal): Promise<CustomerResponse> =>
    customerVehicleApi.getMyProfile(signal),
};

export const adminApi = {
  /** Cần authority `USER_READ`. Trang 0-based. */
  listUsers: (page = 0, size = 20) =>
    client.request<PageResponse<UserResponse>>(`/api/users?page=${page}&size=${size}`),

  /** Cần authority `CUSTOMER_READ`. Trang 0-based. */
  listCustomers: (page = 0, size = 20) =>
    customerVehicleApi.listCustomers({ page, size }),
};

// =========================
// API quản trị người dùng (khu vực admin)
// Cần authority: USER_READ / USER_UPDATE / USER_DELETE
// =========================

export const adminUserApi = {
  /** Danh sách người dùng. Trang 0-based. */
  listUsers: async (
    params: { page?: number; size?: number; sortBy?: string; sortDirection?: "ASC" | "DESC" } = {},
  ): Promise<PageResponse<UserResponse>> => {
    return client.requestPage<PageResponse<UserResponse>>("/api/users", {
      page: params.page ?? 0,
      size: params.size ?? 50,
      sortBy: params.sortBy ?? "createdAt",
      sortDirection: params.sortDirection ?? "DESC",
    });
  },

  /** Cập nhật người dùng (cần `USER_UPDATE`). */
  updateUser: async (
    id: string,
    data: UserUpdateRequest,
  ): Promise<UserResponse> => {
    return client.request<UserResponse>(`/api/users/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Xoá người dùng (cần `USER_DELETE`). */
  deleteUser: async (id: string): Promise<void> => {
    await client.request<void>(`/api/users/${id}`, { method: "DELETE" });
  },

  /** Gán / gỡ role (cần `USER_UPDATE`). */
  assignRoles: async (
    id: string,
    roleIds: string[],
  ): Promise<UserResponse> => {
    return client.request<UserResponse>(`/api/users/${id}/roles`, {
      method: "POST",
      body: roleIds,
    });
  },

  /** Danh sách role (cần `ROLE_READ`). */
  listRoles: async (size = 50) => {
    return client.requestPage<PageResponse<RoleResponse>>("/api/roles", {
      page: 0,
      size,
    });
  },
};

export { customerVehicleApi };
