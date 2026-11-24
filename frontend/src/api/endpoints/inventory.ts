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
  StockAdjustmentRequest,
} from "../types";

/** Payload tạo/sửa dịch vụ — khớp `ServiceRequest.java`. */
export interface ServiceWriteRequest {
  categoryId: string;
  code: string;
  name: string;
  duration_minutes: number;
  required_techs: number;
  baseLaborPrice: number;
  isActive?: boolean;
}

/** Payload tạo/sửa phụ tùng — khớp `PartRequest.java`. */
export interface PartWriteRequest {
  categoryId: string;
  /** Để trống thì backend tự sinh SKU từ tên sản phẩm. */
  sku?: string | null;
  oemCode?: string | null;
  name: string;
  brand?: string | null;
  /** Link ảnh sản phẩm (tuỳ chọn). */
  imageUrl?: string | null;
  /** Mô tả sản phẩm (tuỳ chọn). */
  description?: string | null;
  unit: string;
  sellingPrice: number;
  minStockLevel?: number;
  /** Tồn kho ban đầu — chỉ dùng khi tạo mới. */
  initialStock?: number;
  isActive?: boolean;
}

/** Payload tạo/sửa nhóm — khớp `CategoryRequest.java`. */
export interface CategoryWriteRequest {
  code: string;
  name: string;
  description?: string | null;
}

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

  /** Tạo dịch vụ mới. Cần authority `SERVICE_WRITE`. */
  createService: async (
    data: ServiceWriteRequest,
  ): Promise<ServiceResponse> => {
    return client.request<ServiceResponse>("/api/services", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật dịch vụ. Cần authority `SERVICE_WRITE`. */
  updateService: async (
    id: string,
    data: ServiceWriteRequest,
  ): Promise<ServiceResponse> => {
    return client.request<ServiceResponse>(`/api/services/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Vô hiệu hóa dịch vụ (soft delete → isActive = false). Cần `SERVICE_WRITE`. */
  deleteService: async (id: string): Promise<void> => {
    await client.request<void>(`/api/services/${id}`, { method: "DELETE" });
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

  /** Tạo phụ tùng mới. Cần authority `PART_WRITE`. */
  createPart: async (data: PartWriteRequest): Promise<PartResponse> => {
    return client.request<PartResponse>("/api/parts", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật phụ tùng. Cần authority `PART_WRITE`. */
  updatePart: async (
    id: string,
    data: PartWriteRequest,
  ): Promise<PartResponse> => {
    return client.request<PartResponse>(`/api/parts/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Vô hiệu hóa phụ tùng (soft delete → isActive = false). Cần `PART_WRITE`. */
  deletePart: async (id: string): Promise<void> => {
    await client.request<void>(`/api/parts/${id}`, { method: "DELETE" });
  },

  /**
   * Nhập / hiệu chỉnh tồn kho thủ công. Cần authority `STOCK_WRITE`.
   *
   * - `mode: "ADD"` → cộng thêm `quantity` vào tồn thực.
   * - `mode: "SET"` → đặt tồn thực bằng đúng `quantity`.
   */
  adjustPartStock: async (
    id: string,
    data: StockAdjustmentRequest,
  ): Promise<PartResponse> => {
    return client.request<PartResponse>(`/api/parts/${id}/stock`, {
      method: "POST",
      body: data,
    });
  },

  /** Gắn thêm một dòng xe tương thích. Cần authority `PART_WRITE`. */
  addPartCompatibility: async (
    partId: string,
    data: {
      vehicleBrand: string;
      vehicleModel: string;
      yearFrom?: number | null;
      yearTo?: number | null;
    },
  ): Promise<PartCompatibilityResponse> => {
    return client.request<PartCompatibilityResponse>(
      `/api/parts/${partId}/compatibilities`,
      { method: "POST", body: data },
    );
  },

  /** Gỡ một dòng xe tương thích. Cần authority `PART_WRITE`. */
  deletePartCompatibility: async (
    partId: string,
    compatibilityId: string,
  ): Promise<void> => {
    await client.request<void>(
      `/api/parts/${partId}/compatibilities/${compatibilityId}`,
      { method: "DELETE" },
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
