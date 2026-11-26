/**
 * Endpoint client cho `customer-vehicle-service`
 *
 * Kết nối trực tiếp tới Spring Cloud Gateway (`/api/customers`, `/api/vehicles`, `/api/service-history`)
 * và tự động fallback sang MySQL bridge trên `agent-service` (`/ai/customer-vehicles/*`)
 * khi môi trường dev chỉ chạy cụm AI + MySQL (`scripts/run-all.ps1`).
 */
import client, { isApiError } from "../client";
import type {
  CustomerCreateRequest,
  CustomerResponse,
  CustomerUpdateRequest,
  PageResponse,
  ServiceHistoryCreateRequest,
  ServiceHistoryResponse,
  VehicleCreateRequest,
  VehicleResponse,
  VehicleUpdateRequest,
} from "../types";

export interface ListCustomersParams {
  keyword?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export interface ListVehiclesParams {
  licensePlate?: string;
  keyword?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

function isRetryableViaBridge(err: unknown): boolean {
  if (!isApiError(err)) return false;
  // Không có status → lỗi mạng (fetch bị reject).
  if (err.status === undefined) return true;
  // Chỉ lỗi hạ tầng (5xx) mới thử lại được.
  return err.status >= 500;
}

async function withBridgeFallback<T>(
  primary: () => Promise<T>,
  bridge: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    if (!isRetryableViaBridge(err)) throw err;
    return bridge();
  }
}

export const customerVehicleApi = {
  // ── 1. Khách hàng (Customers) ──────────────────────────────────────────────
  getMyProfile: async (signal?: AbortSignal): Promise<CustomerResponse> => {
    try {
      return await client.request<CustomerResponse>("/api/customers/me", { signal });
    } catch (err) {
      if (!isRetryableViaBridge(err)) throw err;

      const page = await client.requestPage<PageResponse<CustomerResponse>>(
        "/ai/customer-vehicles/customers",
        { page: 0, size: 1 },
      );
      if (page.items && page.items.length > 0) return page.items[0];
      throw new Error("Chưa tìm thấy hồ sơ khách hàng");
    }
  },

  listCustomers: async (
    params: ListCustomersParams = {},
  ): Promise<PageResponse<CustomerResponse>> => {
    const query = {
      keyword: params.keyword,
      isActive: params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    return withBridgeFallback(
      () =>
        client.requestPage<PageResponse<CustomerResponse>>(
          "/api/customers",
          query,
        ),
      () =>
        client.requestPage<PageResponse<CustomerResponse>>(
          "/ai/customer-vehicles/customers",
          query,
        ),
    );
  },

  createCustomer: async (
    data: CustomerCreateRequest,
  ): Promise<CustomerResponse> => {
    return withBridgeFallback(
      () =>
        client.request<CustomerResponse>("/api/customers", {
          method: "POST",
          body: data,
        }),
      () =>
        client.request<CustomerResponse>(
          "/ai/customer-vehicles/customers",
          {
            method: "POST",
            body: data,
          },
        ),
    );
  },

  /**
   * Chi tiết một khách hàng — `GET /api/customers/{id}`.
   * Cần authority `CUSTOMER_READ` (khách hàng **không** có quyền này).
   *
   * <p>Không dùng fallback `/ai/customer-vehicles/` cho endpoint này: bridge AI
   * không bảo đảm có đủ trường, và lỗi 4xx (403/404) thì không được phép
   * fallback theo quy ước (xem `withBridgeFallback`).
   */
  getCustomer: async (id: string): Promise<CustomerResponse> => {
    return client.request<CustomerResponse>(`/api/customers/${id}`);
  },

  updateCustomer: async (
    id: string,
    data: CustomerUpdateRequest,
  ): Promise<CustomerResponse> => {
    return client.request<CustomerResponse>(`/api/customers/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  deleteCustomer: async (id: string): Promise<void> => {
    return client.request<void>(`/api/customers/${id}`, {
      method: "DELETE",
    });
  },

  // ── 2. Phương tiện (Vehicles) ──────────────────────────────────────────────
  listVehicles: async (
    params: ListVehiclesParams = {},
  ): Promise<PageResponse<VehicleResponse>> => {
    const query = {
      licensePlate: params.licensePlate,
      keyword: params.keyword,
      isActive: params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    return withBridgeFallback(
      () =>
        client.requestPage<PageResponse<VehicleResponse>>(
          "/api/vehicles",
          query,
        ),
      () =>
        client.requestPage<PageResponse<VehicleResponse>>(
          "/ai/customer-vehicles/vehicles",
          query,
        ),
    );
  },

  getVehicleById: async (id: string): Promise<VehicleResponse> => {
    return client.request<VehicleResponse>(`/api/vehicles/${id}`);
  },

  createVehicle: async (
    data: VehicleCreateRequest,
  ): Promise<VehicleResponse> => {
    return withBridgeFallback(
      () =>
        client.request<VehicleResponse>("/api/vehicles", {
          method: "POST",
          body: data,
        }),
      () =>
        client.request<VehicleResponse>(
          "/ai/customer-vehicles/vehicles",
          {
            method: "POST",
            body: data,
          },
        ),
    );
  },

  updateVehicle: async (
    id: string,
    data: VehicleUpdateRequest,
  ): Promise<VehicleResponse> => {
    return client.request<VehicleResponse>(`/api/vehicles/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  deleteVehicle: async (id: string): Promise<void> => {
    return client.request<void>(`/api/vehicles/${id}`, {
      method: "DELETE",
    });
  },

  // ── 3. Lịch sử bảo dưỡng (Service History) ─────────────────────────────────
  //
  // Lưu ý bảo mật quan trọng cho toàn bộ nhóm này:
  // bridge `/ai/customer-vehicles/service-history` KHÔNG có authentication và
  // không lọc theo caller — gọi nó là đọc được TOÀN BỘ lịch sử bảo dưỡng của
  // mọi khách hàng. Trước đây code rơi về bridge khi API chính trả 403
  // (nghĩa là người dùng bị chặn quyền) → fail-open.
  //
  // `withBridgeFallback` chỉ rơi về bridge khi lỗi mạng / 5xx, nên 401/403/404
  // giờ bị ném thẳng ra ngoài đúng như ý đồ.
  getMyServiceHistory: async (
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    return withBridgeFallback(
      () =>
        client.requestPage<PageResponse<ServiceHistoryResponse>>(
          "/api/service-history/me",
          { page, size },
        ),
      () =>
        client.requestPage<PageResponse<ServiceHistoryResponse>>(
          "/ai/customer-vehicles/service-history",
          { page, size },
        ),
    );
  },

  /**
   * Lịch sử bảo dưỡng của MỘT khách hàng — chỉ nhân viên.
   *
   * Backend chặn CUSTOMER bằng `@PreAuthorize`. Ở đây KHÔNG có fallback sang
   * bridge cho nhánh này: bridge trả về lịch sử của mọi khách hàng nếu không
   * truyền `customerId`, và nếu truyền thì vẫn không kiểm tra người gọi.
   */
  getCustomerServiceHistory: async (
    customerId: string,
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    return client.requestPage<PageResponse<ServiceHistoryResponse>>(
      `/api/customers/${customerId}/service-history`,
      { page, size },
    );
  },

  /**
   * Lịch sử bảo dưỡng của MỘT xe — chỉ nhân viên.
   *
   * Không fallback sang bridge: bridge đọc thẳng bảng `vehicle_service_histories`
   * mà không kiểm tra vai trò, nên rơi về đó khi backend trả 403 là fail-open.
   */
  getVehicleServiceHistory: async (
    vehicleId: string,
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    return client.requestPage<PageResponse<ServiceHistoryResponse>>(
      `/api/vehicles/${vehicleId}/service-history`,
      { page, size },
    );
  },

  /**
   * Toàn bộ lịch sử bảo dưỡng của gara (góc nhìn quản trị).
   *
   * Backend chặn CUSTOMER bằng `@PreAuthorize`. Không có fallback bridge tương
   * đương — bridge không có endpoint "tất cả" tương đương và cũng không kiểm
   * tra vai trò.
   */
  getAllServiceHistory: async (
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    return client.requestPage<PageResponse<ServiceHistoryResponse>>(
      "/api/service-history",
      { page, size },
    );
  },

  createVehicleServiceHistory: async (
    vehicleId: string,
    data: ServiceHistoryCreateRequest,
  ): Promise<ServiceHistoryResponse> => {
    return withBridgeFallback(
      () =>
        client.request<ServiceHistoryResponse>(
          `/api/vehicles/${vehicleId}/service-history`,
          {
            method: "POST",
            body: data,
          },
        ),
      () =>
        client.request<ServiceHistoryResponse>(
          `/ai/customer-vehicles/vehicles/${vehicleId}/service-history`,
          {
            method: "POST",
            body: data,
          },
        ),
    );
  },
};

