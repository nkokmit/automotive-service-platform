/**
 * Endpoint client cho `inventory-service` — catalog dịch vụ + phụ tùng + kho.
 *
 * Yêu cầu authority:
 *  - `SERVICE_READ` / `SERVICE_WRITE`  cho /api/services, /api/service-categories
 *  - `PART_READ` / `PART_WRITE`        cho /api/parts, /api/part-categories
 *  - `STOCK_WRITE`                    cho /api/parts/issue
 *  - `SUPPLIER_READ` / `SUPPLIER_WRITE` cho /api/suppliers
 *  - `PURCHASE_ORDER_READ` / `PURCHASE_ORDER_WRITE` cho /api/purchase-orders
 *  - `INVENTORY_TRANSACTION_READ`      cho /api/inventory-transactions
 *
 * Lưu ý: role CUSTOMER ban đầu KHÔNG có 2 quyền trên (V10 migration ghi rõ
 * "CUSTOMER receives none"). Migration `V17__grant_customer_catalog_read.sql`
 * đã cấp quyền cho CUSTOMER để khách xem được catalog.
 */
import client from "../client";
import type {
  CategoryResponse,
  InventoryTransactionResponse,
  InventoryTransactionType,
  InventoryReferenceType,
  PageResponse,
  PartCompatibilityResponse,
  PartPricingResponse,
  PartResponse,
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  ServiceBomResponse,
  ServiceResponse,
  StockAvailabilityResponse,
  SupplierResponse,
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
  /** Mã kho — bắt buộc, tối đa 50 ký tự. */
  sku: string;
  oemCode?: string | null;
  name: string;
  brand?: string | null;
  unit: string;
  sellingPrice: number;
  minStockLevel?: number;
  isActive?: boolean;
}

/** Payload tạo/sửa nhóm dịch vụ hoặc nhóm phụ tùng — khớp `CategoryRequest.java`. */
export type CategoryWriteRequest = {
  code: string;
  name: string;
  description?: string | null;
};

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

/** Payload tạo/sửa nhà cung cấp — khớp `SupplierRequest.java`. */
export interface SupplierWriteRequest {
  /** Mã nhà cung cấp — bắt buộc, tối đa 30 ký tự. */
  code: string;
  name: string;
  taxCode?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
}

/** Payload thêm/sửa dòng định mức — khớp `ServiceBomRequest.java`. */
export interface ServiceBomWriteRequest {
  partId: string;
  default_quantity: number;
  note?: string | null;
}

/** Payload cập nhật dòng định mức — khớp `ServiceBomUpdateRequest.java`. */
export interface ServiceBomUpdateRequest {
  default_quantity: number;
  note?: string | null;
}

/** Payload thêm phụ tùng vào đơn nhập hàng — khớp `PurchaseOrderItemRequest.java`. */
export interface PurchaseOrderItemWriteRequest {
  partId: string;
  quantity: number;
  importPrice: number;
}

/** Payload tạo/sửa đơn nhập hàng — khớp `PurchaseOrderRequest.java`. */
export interface PurchaseOrderWriteRequest {
  /** Mã đơn — tuỳ chọn, tối đa 50 ký tự (backend tự sinh nếu bỏ trống). */
  code?: string | null;
  supplierId: string;
  note?: string | null;
  items: PurchaseOrderItemWriteRequest[];
}

/** Payload kiểm tra tồn / lấy giá — khớp `StockItemRequest.java`. */
export interface StockItemWriteRequest {
  partId: string;
  quantity: number;
}

/** Payload xuất kho — khớp `StockOperationRequest.java`. */
export interface StockOperationWriteRequest {
  /** Work Order id làm tham chiếu. */
  referenceId: string;
  items: StockItemWriteRequest[];
  note?: string | null;
}

export interface ListSuppliersParams {
  keyword?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface ListPurchaseOrdersParams {
  keyword?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface ListInventoryTransactionsParams {
  partId?: string;
  type?: InventoryTransactionType;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  /** ISO-8601 instant, VD: `2026-11-01T00:00:00Z`. */
  fromDate?: string;
  toDate?: string;
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

  /**
   * Chi tiết một nhóm phụ tùng — `GET /api/part-categories/{id}`.
   * Cần authority `PART_READ`.
   */
  getPartCategory: async (id: string): Promise<CategoryResponse> => {
    return client.request<CategoryResponse>(`/api/part-categories/${id}`);
  },

  /** Tạo nhóm phụ tùng. Cần authority `PART_WRITE`. */
  createPartCategory: async (
    data: CategoryWriteRequest,
  ): Promise<CategoryResponse> => {
    return client.request<CategoryResponse>("/api/part-categories", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật nhóm phụ tùng. Cần authority `PART_WRITE`. */
  updatePartCategory: async (
    id: string,
    data: CategoryWriteRequest,
  ): Promise<CategoryResponse> => {
    return client.request<CategoryResponse>(`/api/part-categories/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Xoá nhóm phụ tùng (không xoá được nếu nhóm còn phụ tùng). */
  deletePartCategory: async (id: string): Promise<void> => {
    await client.request<void>(`/api/part-categories/${id}`, {
      method: "DELETE",
    });
  },

  // ── Kho: kiểm tra tồn & định giá ─────────────────────────────────────────
  /**
   * Kiểm tra tồn kho tức thời cho một danh sách dòng báo giá.
   * Cần authority `PART_READ`. Không ghi sổ kho.
   */
  checkAvailability: async (
    items: StockItemWriteRequest[],
  ): Promise<StockAvailabilityResponse[]> => {
    return client.request<StockAvailabilityResponse[]>(
      "/api/parts/check-availability",
      { method: "POST", body: { items } },
    );
  },

  /**
   * Lấy đơn giá bán và tổng tiền theo từng dòng báo giá.
   * Cần authority `PART_READ`. Không ghi sổ kho.
   */
  getPricing: async (
    items: StockItemWriteRequest[],
  ): Promise<PartPricingResponse[]> => {
    return client.request<PartPricingResponse[]>("/api/parts/pricing", {
      method: "POST",
      body: { items },
    });
  },

  /**
   * Xuất kho cho một Work Order (giảm onHand và reserved).
   * Cần authority `STOCK_WRITE`.
   */
  issueParts: async (
    data: StockOperationWriteRequest,
  ): Promise<InventoryTransactionResponse[]> => {
    return client.request<InventoryTransactionResponse[]>("/api/parts/issue", {
      method: "POST",
      body: data,
    });
  },

  // ── Nhà cung cấp ──────────────────────────────────────────────────────────
  listSuppliers: async (
    params: ListSuppliersParams = {},
  ): Promise<PageResponse<SupplierResponse>> => {
    return client.requestPage<PageResponse<SupplierResponse>>("/api/suppliers", {
      keyword: params.keyword,
      isActive: params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 50,
      sortBy: params.sortBy ?? "name",
      sortDirection: params.sortDirection ?? "ASC",
    });
  },

  getSupplier: async (id: string): Promise<SupplierResponse> => {
    return client.request<SupplierResponse>(`/api/suppliers/${id}`);
  },

  /** Tạo nhà cung cấp. Cần authority `SUPPLIER_WRITE`. */
  createSupplier: async (
    data: SupplierWriteRequest,
  ): Promise<SupplierResponse> => {
    return client.request<SupplierResponse>("/api/suppliers", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật nhà cung cấp. Cần authority `SUPPLIER_WRITE`. */
  updateSupplier: async (
    id: string,
    data: SupplierWriteRequest,
  ): Promise<SupplierResponse> => {
    return client.request<SupplierResponse>(`/api/suppliers/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Xoá nhà cung cấp (không xoá được nếu đang có đơn nhập hàng). */
  deleteSupplier: async (id: string): Promise<void> => {
    await client.request<void>(`/api/suppliers/${id}`, { method: "DELETE" });
  },

  // ── Đơn nhập hàng (Purchase Order) ────────────────────────────────────────
  listPurchaseOrders: async (
    params: ListPurchaseOrdersParams = {},
  ): Promise<PageResponse<PurchaseOrderResponse>> => {
    return client.requestPage<PageResponse<PurchaseOrderResponse>>(
      "/api/purchase-orders",
      {
        keyword: params.keyword,
        status: params.status,
        supplierId: params.supplierId,
        page: params.page ?? 0,
        size: params.size ?? 50,
        sortBy: params.sortBy ?? "createdAt",
        sortDirection: params.sortDirection ?? "DESC",
      },
    );
  },

  getPurchaseOrder: async (id: string): Promise<PurchaseOrderResponse> => {
    return client.request<PurchaseOrderResponse>(`/api/purchase-orders/${id}`);
  },

  /** Tạo đơn nhập hàng (trạng thái DRAFT). Cần `PURCHASE_ORDER_WRITE`. */
  createPurchaseOrder: async (
    data: PurchaseOrderWriteRequest,
  ): Promise<PurchaseOrderResponse> => {
    return client.request<PurchaseOrderResponse>("/api/purchase-orders", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật đơn nhập hàng (chỉ khi DRAFT). Cần `PURCHASE_ORDER_WRITE`. */
  updatePurchaseOrder: async (
    id: string,
    data: PurchaseOrderWriteRequest,
  ): Promise<PurchaseOrderResponse> => {
    return client.request<PurchaseOrderResponse>(`/api/purchase-orders/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Duyệt đơn: DRAFT → APPROVED. Cần `PURCHASE_ORDER_WRITE`. */
  approvePurchaseOrder: async (
    id: string,
  ): Promise<PurchaseOrderResponse> => {
    return client.request<PurchaseOrderResponse>(
      `/api/purchase-orders/${id}/approve`,
      { method: "POST" },
    );
  },

  /**
   * Nhập kho: APPROVED → RECEIVED (tăng tồn thực, tính lại giá vốn bình
   * quân, ghi sổ kho IMPORT). Cần `PURCHASE_ORDER_WRITE`.
   */
  completePurchaseOrder: async (
    id: string,
  ): Promise<PurchaseOrderResponse> => {
    return client.request<PurchaseOrderResponse>(
      `/api/purchase-orders/${id}/complete`,
      { method: "POST" },
    );
  },

  /** Hủy đơn (DRAFT hoặc APPROVED). Cần `PURCHASE_ORDER_WRITE`. */
  cancelPurchaseOrder: async (
    id: string,
  ): Promise<PurchaseOrderResponse> => {
    return client.request<PurchaseOrderResponse>(
      `/api/purchase-orders/${id}/cancel`,
      { method: "POST" },
    );
  },

  // ── Sổ nhật ký kho ────────────────────────────────────────────────────────
  listInventoryTransactions: async (
    params: ListInventoryTransactionsParams = {},
  ): Promise<PageResponse<InventoryTransactionResponse>> => {
    return client.requestPage<PageResponse<InventoryTransactionResponse>>(
      "/api/inventory-transactions",
      {
        partId: params.partId,
        type: params.type,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        fromDate: params.fromDate,
        toDate: params.toDate,
        page: params.page ?? 0,
        size: params.size ?? 50,
        sortBy: params.sortBy ?? "createdAt",
        sortDirection: params.sortDirection ?? "DESC",
      },
    );
  },

  // ── BOM dịch vụ ──────────────────────────────────────────────────────────
  /** Thêm phụ tùng vào định mức của dịch vụ. Cần `SERVICE_WRITE`. */
  addServiceBomItem: async (
    serviceId: string,
    data: ServiceBomWriteRequest,
  ): Promise<ServiceBomResponse> => {
    return client.request<ServiceBomResponse>(`/api/services/${serviceId}/bom`, {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật dòng định mức. Cần `SERVICE_WRITE`. */
  updateServiceBomItem: async (
    serviceId: string,
    bomId: string,
    data: ServiceBomUpdateRequest,
  ): Promise<ServiceBomResponse> => {
    return client.request<ServiceBomResponse>(
      `/api/services/${serviceId}/bom/${bomId}`,
      { method: "PUT", body: data },
    );
  },

  /** Xoá dòng định mức. Cần `SERVICE_WRITE`. */
  deleteServiceBomItem: async (
    serviceId: string,
    bomId: string,
  ): Promise<void> => {
    await client.request<void>(`/api/services/${serviceId}/bom/${bomId}`, {
      method: "DELETE",
    });
  },

  // ── Nhóm dịch vụ (ghi) ────────────────────────────────────────────────────
  /**
   * Chi tiết một nhóm dịch vụ — `GET /api/service-categories/{id}`.
   * Cần authority `SERVICE_READ`.
   */
  getServiceCategory: async (id: string): Promise<CategoryResponse> => {
    return client.request<CategoryResponse>(`/api/service-categories/${id}`);
  },

  /**
   * Danh sách dịch vụ thuộc một nhóm — `GET /api/service-categories/{id}/services`.
   * Cần authority `SERVICE_READ`.
   *
   * <p>Dịch vụ đang hoạt động xếp trước, sau đó dịch vụ đã ẩn. Dùng để admin
   * xem nhanh nhóm đang chứa dịch vụ nào trước khi thêm/xoá/đổi nhóm.
   */
  listServicesByCategory: async (
    categoryId: string,
  ): Promise<ServiceResponse[]> => {
    return client.request<ServiceResponse[]>(
      `/api/service-categories/${categoryId}/services`,
    );
  },

  createServiceCategory: async (
    data: CategoryWriteRequest,
  ): Promise<CategoryResponse> => {
    return client.request<CategoryResponse>("/api/service-categories", {
      method: "POST",
      body: data,
    });
  },

  updateServiceCategory: async (
    id: string,
    data: CategoryWriteRequest,
  ): Promise<CategoryResponse> => {
    return client.request<CategoryResponse>(`/api/service-categories/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  deleteServiceCategory: async (id: string): Promise<void> => {
    await client.request<void>(`/api/service-categories/${id}`, {
      method: "DELETE",
    });
  },
};
