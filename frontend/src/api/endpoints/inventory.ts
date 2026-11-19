/**
 * Endpoint client cho `inventory-service` — catalog dịch vụ + phụ tùng.
 *
 * Yêu cầu authority:
 *  - `SERVICE_READ` cho /api/services, /api/service-categories
 *  - `PART_READ`   cho /api/parts, /api/part-categories
 *
 * Lưu ý: role CUSTOMER ban đầu KHÔNG có 2 quyền trên (V10 migration ghi rõ
 * "CUSTOMER receives none"). Migration `V17__grant_customer_catalog_read.sql`
 * đã cấp quyền cho CUSTOMER để khách xem được catalog.
 */
import client from "../client";
import type {
  CategoryResponse,
  PageResponse,
  PartCompatibilityResponse,
  PartResponse,
  ServiceBomResponse,
  ServiceResponse,
} from "../types";

export interface ListServicesParams {
  keyword?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface ListPartsParams {
  keyword?: string;
  sku?: string;
  oemCode?: string;
  brand?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStockOnly?: boolean;
  vehicleBrand?: string;
  vehicleModel?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export const inventoryApi = {
  // ── Dịch vụ ─────────────────────────────────────────────────────────────────
  listServices: async (
    params: ListServicesParams = {},
  ): Promise<PageResponse<ServiceResponse>> => {
    return client.requestPage<PageResponse<ServiceResponse>>("/api/services", {
      keyword: params.keyword,
      categoryId: params.categoryId,
      isActive: params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 50,
      sortBy: params.sortBy ?? "name",
      sortDirection: params.sortDirection ?? "ASC",
    });
  },

  getService: async (id: string): Promise<ServiceResponse> => {
    return client.request<ServiceResponse>(`/api/services/${id}`);
  },

  /** Định mức phụ tùng đi kèm dịch vụ (BOM). */
  getServiceBom: async (serviceId: string): Promise<ServiceBomResponse[]> => {
    return client.request<ServiceBomResponse[]>(
      `/api/services/${serviceId}/bom`,
    );
  },

  // ── Nhóm dịch vụ ────────────────────────────────────────────────────────────
  listServiceCategories: async (
    params: { keyword?: string; page?: number; size?: number } = {},
  ): Promise<PageResponse<CategoryResponse>> => {
    return client.requestPage<PageResponse<CategoryResponse>>(
      "/api/service-categories",
      { keyword: params.keyword, page: params.page ?? 0, size: params.size ?? 50 },
    );
  },

  // ── Phụ tùng ───────────────────────────────────────────────────────────────
  listParts: async (
    params: ListPartsParams = {},
  ): Promise<PageResponse<PartResponse>> => {
    return client.requestPage<PageResponse<PartResponse>>("/api/parts", {
      keyword: params.keyword,
      sku: params.sku,
      oemCode: params.oemCode,
      brand: params.brand,
      categoryId: params.categoryId,
      isActive: params.isActive,
      lowStockOnly: params.lowStockOnly,
      vehicleBrand: params.vehicleBrand,
      vehicleModel: params.vehicleModel,
      page: params.page ?? 0,
      size: params.size ?? 50,
      sortBy: params.sortBy ?? "name",
      sortDirection: params.sortDirection ?? "ASC",
    });
  },

  getPart: async (id: string): Promise<PartResponse> => {
    return client.request<PartResponse>(`/api/parts/${id}`);
  },

  /** Dòng xe tương thích với phụ tùng. */
  getPartCompatibilities: async (
    partId: string,
  ): Promise<PartCompatibilityResponse[]> => {
    return client.request<PartCompatibilityResponse[]>(
      `/api/parts/${partId}/compatibilities`,
    );
  },

  // ── Nhóm phụ tùng ──────────────────────────────────────────────────────────
  listPartCategories: async (
    params: { keyword?: string; page?: number; size?: number } = {},
  ): Promise<PageResponse<CategoryResponse>> => {
    return client.requestPage<PageResponse<CategoryResponse>>(
      "/api/part-categories",
      { keyword: params.keyword, page: params.page ?? 0, size: params.size ?? 50 },
    );
  },
};
