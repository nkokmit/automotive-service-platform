/**
 * Endpoint cho customer-vehicle-service.
 *
 * Chỉ những route mà role CUSTOMER thực sự gọi được. Các route quản trị
 * (GET /api/customers, GET /api/vehicles, ...) cần authority tương ứng và sẽ trả
 * 403 nếu role hiện tại không có — xem `hasAuthority()` trong ../types.
 */
import client from "../client";
import type { CustomerResponse, PageResponse, UserResponse } from "../types";

export const userApi = {
  me: (): Promise<UserResponse> => client.request<UserResponse>("/api/users/me"),
};

export const customerApi = {
  /** Hồ sơ khách hàng của chính người đang đăng nhập. Trả 403 nếu chưa có hồ sơ. */
  me: (): Promise<CustomerResponse> => client.request<CustomerResponse>("/api/customers/me"),
};

export const adminApi = {
  /** Cần authority `USER_READ`. Trang 0-based. */
  listUsers: (page = 0, size = 20) =>
    client.request<PageResponse<UserResponse>>(`/api/users?page=${page}&size=${size}`),

  /** Cần authority `CUSTOMER_READ`. Trang 0-based. */
  listCustomers: (page = 0, size = 20) =>
    client.request<PageResponse<CustomerResponse>>(`/api/customers?page=${page}&size=${size}`),
};