/**
 * Endpoint cho user-service & customer-vehicle-service.
 */
import client from "../client";
import type { CustomerResponse, PageResponse, UserResponse } from "../types";
import { customerVehicleApi } from "./customerVehicle";

export const userApi = {
  me: (): Promise<UserResponse> => client.request<UserResponse>("/api/users/me"),
};

export const customerApi = {
  /** Hồ sơ khách hàng của chính người đang đăng nhập (kèm fallback sang MySQL bridge). */
  me: (): Promise<CustomerResponse> => customerVehicleApi.getMyProfile(),
};

export const adminApi = {
  /** Cần authority `USER_READ`. Trang 0-based. */
  listUsers: (page = 0, size = 20) =>
    client.request<PageResponse<UserResponse>>(`/api/users?page=${page}&size=${size}`),

  /** Cần authority `CUSTOMER_READ`. Trang 0-based. */
  listCustomers: (page = 0, size = 20) =>
    customerVehicleApi.listCustomers({ page, size }),
};

export { customerVehicleApi };
