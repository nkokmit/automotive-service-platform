/**
 * Endpoint client cho `customer-vehicle-service`
 *
 * Kết nối trực tiếp tới Spring Cloud Gateway (`/api/customers`, `/api/vehicles`, `/api/service-history`)
 * và tự động fallback sang MySQL bridge trên `agent-service` (`/ai/customer-vehicles/*`)
 * khi môi trường dev chỉ chạy cụm AI + MySQL (`scripts/run-all.ps1`).
 */
import client from "../client";
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

export const customerVehicleApi = {
  // ── 1. Khách hàng (Customers) ──────────────────────────────────────────────
  getMyProfile: async (): Promise<CustomerResponse> => {
    try {
      return await client.request<CustomerResponse>("/api/customers/me");
    } catch {
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
    try {
      return await client.requestPage<PageResponse<CustomerResponse>>(
        "/api/customers",
        query,
      );
    } catch {
      return await client.requestPage<PageResponse<CustomerResponse>>(
        "/ai/customer-vehicles/customers",
        query,
      );
    }
  },

  createCustomer: async (
    data: CustomerCreateRequest,
  ): Promise<CustomerResponse> => {
    try {
      return await client.request<CustomerResponse>("/api/customers", {
        method: "POST",
        body: data,
      });
    } catch {
      return await client.request<CustomerResponse>(
        "/ai/customer-vehicles/customers",
        {
          method: "POST",
          body: data,
        },
      );
    }
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
    try {
      return await client.requestPage<PageResponse<VehicleResponse>>(
        "/api/vehicles",
        query,
      );
    } catch {
      return await client.requestPage<PageResponse<VehicleResponse>>(
        "/ai/customer-vehicles/vehicles",
        query,
      );
    }
  },

  getVehicleById: async (id: string): Promise<VehicleResponse> => {
    return client.request<VehicleResponse>(`/api/vehicles/${id}`);
  },

  createVehicle: async (
    data: VehicleCreateRequest,
  ): Promise<VehicleResponse> => {
    try {
      return await client.request<VehicleResponse>("/api/vehicles", {
        method: "POST",
        body: data,
      });
    } catch {
      return await client.request<VehicleResponse>(
        "/ai/customer-vehicles/vehicles",
        {
          method: "POST",
          body: data,
        },
      );
    }
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
  getMyServiceHistory: async (
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    try {
      return await client.requestPage<PageResponse<ServiceHistoryResponse>>(
        "/api/service-history/me",
        { page, size },
      );
    } catch {
      return await client.requestPage<PageResponse<ServiceHistoryResponse>>(
        "/ai/customer-vehicles/service-history",
        { page, size },
      );
    }
  },

  getCustomerServiceHistory: async (
    customerId: string,
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    try {
      return await client.requestPage<PageResponse<ServiceHistoryResponse>>(
        `/api/customers/${customerId}/service-history`,
        { page, size },
      );
    } catch {
      return await client.requestPage<PageResponse<ServiceHistoryResponse>>(
        "/ai/customer-vehicles/service-history",
        { customerId, page, size },
      );
    }
  },

  getVehicleServiceHistory: async (
    vehicleId: string,
    page = 0,
    size = 20,
  ): Promise<PageResponse<ServiceHistoryResponse>> => {
    try {
      return await client.requestPage<PageResponse<ServiceHistoryResponse>>(
        `/api/vehicles/${vehicleId}/service-history`,
        { page, size },
      );
    } catch {
      return await client.requestPage<PageResponse<ServiceHistoryResponse>>(
        `/ai/customer-vehicles/vehicles/${vehicleId}/service-history`,
        { page, size },
      );
    }
  },

  createVehicleServiceHistory: async (
    vehicleId: string,
    data: ServiceHistoryCreateRequest,
  ): Promise<ServiceHistoryResponse> => {
    try {
      return await client.request<ServiceHistoryResponse>(
        `/api/vehicles/${vehicleId}/service-history`,
        {
          method: "POST",
          body: data,
        },
      );
    } catch {
      return await client.request<ServiceHistoryResponse>(
        `/ai/customer-vehicles/vehicles/${vehicleId}/service-history`,
        {
          method: "POST",
          body: data,
        },
      );
    }
  },
};

