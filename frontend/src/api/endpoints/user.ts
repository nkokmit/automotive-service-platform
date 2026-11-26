/**
 * Endpoint cho user-service & customer-vehicle-service.
 */
import client from "../client";
import type {
  CustomerResponse,
  PageResponse,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from "../types";
import { customerVehicleApi } from "./customerVehicle";
import { roleApi, userRoleApi } from "./rbac";

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

  /**
   * Chi tiết một người dùng — `GET /api/users/{id}`.
   * Cần authority `USER_READ` (chỉ ADMIN/MANAGER).
   *
   * <p>Hữu ích khi cần xem thông tin đầy đủ của một user mà không mở danh
   * sách (vd: xem chi tiết sau khi tạo, hoặc tra cứu từ log).
   */
  getUser: async (id: string): Promise<UserResponse> => {
    return client.request<UserResponse>(`/api/users/${id}`);
  },

  /**
   * Tạo người dùng mới — `POST /api/users`.
   * Cần authority `USER_CREATE` (chỉ ADMIN).
   *
   * <p>Body khớp `UserCreateRequest.java`: `username` / `password` / `email`
   * bắt buộc. `roleIds` là `Set<UUID>` → gửi dạng array.
   *
   * <p>Khác `POST /api/auth/register` (tự đăng ký): endpoint này dành cho
   * nhân viên tạo tài khoản hộ khách và **gán role ngay lúc tạo**.
   */
  createUser: async (data: UserCreateRequest): Promise<UserResponse> => {
    return client.request<UserResponse>("/api/users", {
      method: "POST",
      body: data,
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
    return userRoleApi.assignRoles(id, roleIds);
  },

  /** Gỡ một role khỏi user (cần `USER_UPDATE`). */
  removeRole: async (
    id: string,
    roleId: string,
  ): Promise<UserResponse> => {
    return userRoleApi.removeRole(id, roleId);
  },

  /** Danh sách role (cần `ROLE_READ`). */
  listRoles: async (size = 50) => {
    return roleApi.listRoles({ page: 0, size });
  },
};

export { customerVehicleApi };
