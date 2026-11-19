/**
 * Endpoint client cho `staff-service` — hồ sơ nhân viên (kỹ thuật viên, thợ).
 *
 * Yêu cầu authority: `STAFF_READ` cho các API GET.
 * Role CUSTOMER không được cấp quyền này (xem V9 của user-service) → các API
 * này chỉ dùng được ở khu vực admin.
 */
import client from "../client";
import type { PageResponse, StaffResponse } from "../types";

export interface ListStaffParams {
  keyword?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export const staffApi = {
  /** Danh sách nhân viên. Trang 0-based. */
  listStaff: async (
    params: ListStaffParams = {},
  ): Promise<PageResponse<StaffResponse>> => {
    return client.requestPage<PageResponse<StaffResponse>>("/api/staff", {
      keyword: params.keyword,
      isActive: params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sortBy: params.sortBy ?? "createdAt",
      sortDirection: params.sortDirection ?? "DESC",
    });
  },

  getStaffById: async (id: string): Promise<StaffResponse> => {
    return client.request<StaffResponse>(`/api/staff/${id}`);
  },

  /** Tra cứu hồ sơ nhân viên theo tài khoản người dùng. */
  getStaffByUserId: async (userId: string): Promise<StaffResponse> => {
    return client.request<StaffResponse>(`/api/staff/by-user/${userId}`);
  },
};
