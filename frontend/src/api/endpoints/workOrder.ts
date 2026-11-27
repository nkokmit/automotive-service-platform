/**
 * Endpoint client cho `work-order-service` — Phiếu sửa chữa (Work Order).
 *
 * Nguồn: `work-order-service/WorkOrderController` + `EstimateController`
 *        + `WorkOrderServiceLineController` + `WorkOrderPartController`.
 *
 * Yêu cầu authority:
 *  - `WORK_ORDER_READ`            → GET /api/work-orders, /api/work-orders/{id}
 *  - `WORK_ORDER_CREATE`          → POST /api/work-orders
 *  - `WORK_ORDER_DIAGNOSIS_START` → POST /api/work-orders/{id}/start-diagnosis
 *  - `WORK_ORDER_COMPLETE`        → POST /api/work-orders/{id}/complete
 *  - `WORK_ORDER_CANCEL`          → POST /api/work-orders/{id}/cancel
 *  - `ESTIMATE_CREATE`            → POST /api/work-orders/{id}/estimates
 *  - `ESTIMATE_READ`              → GET /api/work-orders/{id}/estimates, /api/estimates/{id}
 *  - `ESTIMATE_UPDATE`            → thêm/gỡ service & part trong estimate
 *  - `ESTIMATE_SUBMIT`            → POST /api/estimates/{id}/submit
 *  - `ESTIMATE_DECISION_RECORD`   → PATCH /api/estimates/{id}/decision
 *  - `SERVICE_LINE_ASSIGN`        → PATCH /api/work-order-service-lines/{id}/assign
 *  - `SERVICE_LINE_READ_ASSIGNED` → GET /api/work-order-service-lines/me
 *  - `SERVICE_LINE_START`         → POST /api/work-order-service-lines/{id}/start
 *  - `SERVICE_LINE_COMPLETE`      → POST /api/work-order-service-lines/{id}/complete
 *  - `PART_ISSUE`                 → POST /api/work-orders/{id}/parts/{partLineId}/issue
 *  - `PART_RELEASE`               → POST /api/work-orders/{id}/parts/{partLineId}/release
 *
 * Đánh giá sau sửa chữa (`WorkOrderFeedbackController`) — KHÔNG dùng authority,
 * chỉ cần đã đăng nhập:
 *  - `GET  /api/work-orders/me/feedback-eligible` → phiếu CLOSED chưa đánh giá
 *  - `POST /api/work-orders/{id}/feedback`         → gửi đánh giá (rating 1..5)
 *  - `GET  /api/work-orders/reviews/summary`        → tổng hợp công khai (permitAll)
 *
 * Lưu ý hợp đồng quan trọng (đã đối chiếu với source backend):
 *  1. Phân công mechanic là **PATCH** `/assign` (không phải POST như ghi trong
 *     tài liệu cũ).
 *  2. `mechanicId` là **id hồ sơ nhân viên** (`staff.id`), không phải user id.
 *  3. `PATCH /api/estimates/{id}/decision` nhận mảng item quyết định; `itemId`
 *     là id của **service line / part line** trong estimate, không phải id
 *     catalog (`serviceId` / `partId`).
 *  4. Xoá service line / part line trả HTTP 204 (body rỗng).
 *  5. `POST /api/work-orders` là idempotent theo `bookingId`: nếu booking đã có
 *     Work Order thì trả HTTP 200 kèm phiếu cũ thay vì 201.
 *  6. Mỗi Work Order chỉ được đánh giá **một lần** (unique key ở DB). Lần
 *     đánh giá thứ hai → HTTP 409 với code 6003.
 */
import client from "../client";
import type {
  AddPartToEstimateRequest,
  AddServiceToEstimateRequest,
  AdminFeedbackPageResponse,
  AssignedServiceLineResponse,
  CreateEstimateRequest,
  CreateWorkOrderRequest,
  EstimateDecisionRequest,
  EstimateResponse,
  EstimateSummaryResponse,
  FeedbackEligiblePageResponse,
  HomepageReviewSummaryResponse,
  PartQuantityRequest,
  WorkOrderFeedbackResponse,
  WorkOrderPageResponse,
  WorkOrderPartLineResponse,
  WorkOrderResponse,
  WorkOrderServiceStatus,
  WorkOrderStatus,
} from "../types";

export interface ListWorkOrdersParams {
  status?: WorkOrderStatus;
  customerId?: string;
  vehicleId?: string;
  bookingId?: string;
  assignedTechId?: string;
  /** ISO-8601 instant. */
  from?: string;
  /** ISO-8601 instant. */
  to?: string;
  page?: number;
  size?: number;
}

// =========================
// Work Order
// =========================

export const workOrderApi = {
  /** Tìm kiếm Work Order. Trang 0-based, size tối đa 100. */
  listWorkOrders: async (
    params: ListWorkOrdersParams = {},
  ): Promise<WorkOrderPageResponse> => {
    return client.requestPage<WorkOrderPageResponse>("/api/work-orders", {
      status: params.status,
      customerId: params.customerId,
      vehicleId: params.vehicleId,
      bookingId: params.bookingId,
      assignedTechId: params.assignedTechId,
      from: params.from,
      to: params.to,
      page: params.page ?? 0,
      size: params.size ?? 20,
    });
  },

  /** Chi tiết một Work Order (kèm estimate và lịch sử trạng thái). */
  getWorkOrder: async (id: string): Promise<WorkOrderResponse> => {
    return client.request<WorkOrderResponse>(`/api/work-orders/${id}`);
  },

  /**
   * Tạo Work Order từ một booking đã check-in.
   *
   * Idempotent theo `bookingId`: nếu booking đã có phiếu, backend trả HTTP 200
   * kèm phiếu cũ. `odometerIn` bắt buộc và phải >= 0.
   */
  createWorkOrder: async (
    data: CreateWorkOrderRequest,
  ): Promise<WorkOrderResponse> => {
    return client.request<WorkOrderResponse>("/api/work-orders", {
      method: "POST",
      body: data,
    });
  },

  /** Chuyển Work Order CREATED → DIAGNOSING. */
  startDiagnosis: async (id: string): Promise<WorkOrderResponse> => {
    return client.request<WorkOrderResponse>(
      `/api/work-orders/${id}/start-diagnosis`,
      { method: "POST" },
    );
  },

  /**
   * Hoàn thành Work Order (IN_PROGRESS → COMPLETED → PENDING_PAYMENT).
   *
   * Chỉ thành công khi mọi service line đã COMPLETED hoặc REJECTED.
   */
  completeWorkOrder: async (id: string): Promise<WorkOrderResponse> => {
    return client.request<WorkOrderResponse>(`/api/work-orders/${id}/complete`, {
      method: "POST",
    });
  },

  /** Huỷ Work Order (chỉ từ CREATED, DIAGNOSING hoặc PENDING_APPROVAL). */
  cancelWorkOrder: async (id: string): Promise<WorkOrderResponse> => {
    return client.request<WorkOrderResponse>(`/api/work-orders/${id}/cancel`, {
      method: "POST",
    });
  },
};

// =========================
// Estimate
// =========================

export const estimateApi = {
  /** Tạo Estimate DRAFT cho một Work Order. */
  createEstimate: async (
    workOrderId: string,
    data: CreateEstimateRequest,
  ): Promise<EstimateResponse> => {
    return client.request<EstimateResponse>(
      `/api/work-orders/${workOrderId}/estimates`,
      { method: "POST", body: data },
    );
  },

  /** Danh sách estimate (summary) của một Work Order. */
  listByWorkOrder: async (
    workOrderId: string,
  ): Promise<EstimateSummaryResponse[]> => {
    return client.request<EstimateSummaryResponse[]>(
      `/api/work-orders/${workOrderId}/estimates`,
    );
  },

  /** Chi tiết một estimate (kèm service line và part line). */
  getEstimate: async (estimateId: string): Promise<EstimateResponse> => {
    return client.request<EstimateResponse>(`/api/estimates/${estimateId}`);
  },

  /** Thêm dịch vụ vào estimate DRAFT (kèm BOM phụ tùng nếu có). */
  addService: async (
    estimateId: string,
    data: AddServiceToEstimateRequest,
  ): Promise<EstimateResponse> => {
    return client.request<EstimateResponse>(
      `/api/estimates/${estimateId}/services`,
      { method: "POST", body: data },
    );
  },

  /** Gỡ service line khỏi estimate. HTTP 204. */
  removeService: async (
    estimateId: string,
    serviceLineId: string,
  ): Promise<void> => {
    await client.request<void>(
      `/api/estimates/${estimateId}/services/${serviceLineId}`,
      { method: "DELETE" },
    );
  },

  /** Thêm phụ tùng vào estimate DRAFT. */
  addPart: async (
    estimateId: string,
    data: AddPartToEstimateRequest,
  ): Promise<EstimateResponse> => {
    return client.request<EstimateResponse>(
      `/api/estimates/${estimateId}/parts`,
      { method: "POST", body: data },
    );
  },

  /** Gỡ part line khỏi estimate. HTTP 204. */
  removePart: async (
    estimateId: string,
    partLineId: string,
  ): Promise<void> => {
    await client.request<void>(
      `/api/estimates/${estimateId}/parts/${partLineId}`,
      { method: "DELETE" },
    );
  },

  /** Gửi estimate DRAFT để khách duyệt (PENDING_APPROVAL). */
  submit: async (estimateId: string): Promise<EstimateResponse> => {
    return client.request<EstimateResponse>(`/api/estimates/${estimateId}/submit`, {
      method: "POST",
    });
  },

  /**
   * Ghi nhận quyết định của khách cho từng item trong estimate.
   *
   * Chỉ gọi được khi estimate ở PENDING_APPROVAL và phải quyết định **tất cả**
   * item còn PENDING — nếu còn item PENDING thì backend giữ nguyên trạng thái.
   */
  decide: async (
    estimateId: string,
    data: EstimateDecisionRequest,
  ): Promise<EstimateResponse> => {
    return client.request<EstimateResponse>(
      `/api/estimates/${estimateId}/decision`,
      { method: "PATCH", body: data },
    );
  },
};

// =========================
// Service line (phân công & tiến độ)
// =========================

export const workOrderServiceLineApi = {
  /**
   * Phân công service line cho một kỹ thuật viên.
   *
   * Backend dùng **PATCH** (tài liệu cũ ghi POST — sai).
   * `mechanicId` là id hồ sơ nhân viên (`staff.id`), không phải user id.
   */
  assign: async (
    serviceLineId: string,
    mechanicId: string,
  ): Promise<AssignedServiceLineResponse> => {
    return client.request<AssignedServiceLineResponse>(
      `/api/work-order-service-lines/${serviceLineId}/assign`,
      { method: "PATCH", body: { mechanicId } },
    );
  },

  /** Các service line được giao cho chính tài khoản đang đăng nhập. */
  listMyLines: async (
    status?: WorkOrderServiceStatus,
  ): Promise<AssignedServiceLineResponse[]> => {
    return client.request<AssignedServiceLineResponse[]>(
      `/api/work-order-service-lines/me${status ? `?status=${status}` : ""}`,
    );
  },

  /** Bắt đầu làm service line (APPROVED → IN_PROGRESS). */
  start: async (
    serviceLineId: string,
  ): Promise<AssignedServiceLineResponse> => {
    return client.request<AssignedServiceLineResponse>(
      `/api/work-order-service-lines/${serviceLineId}/start`,
      { method: "POST" },
    );
  },

  /** Hoàn thành service line (IN_PROGRESS → COMPLETED). */
  complete: async (
    serviceLineId: string,
  ): Promise<AssignedServiceLineResponse> => {
    return client.request<AssignedServiceLineResponse>(
      `/api/work-order-service-lines/${serviceLineId}/complete`,
      { method: "POST" },
    );
  },
};

// =========================
// Phụ tùng trong Work Order
// =========================

export const workOrderPartApi = {
  /** Xuất phụ tùng từ reservation (PART_ISSUE). */
  issue: async (
    workOrderId: string,
    partLineId: string,
    quantity: number,
  ): Promise<WorkOrderPartLineResponse> => {
    return client.request<WorkOrderPartLineResponse>(
      `/api/work-orders/${workOrderId}/parts/${partLineId}/issue`,
      { method: "POST", body: { quantity } satisfies PartQuantityRequest },
    );
  },

  /** Giải phóng reservation phụ tùng (PART_RELEASE). */
  release: async (
    workOrderId: string,
    partLineId: string,
    quantity: number,
  ): Promise<WorkOrderPartLineResponse> => {
    return client.request<WorkOrderPartLineResponse>(
      `/api/work-orders/${workOrderId}/parts/${partLineId}/release`,
      { method: "POST", body: { quantity } satisfies PartQuantityRequest },
    );
  },
};

// =========================
// Đánh giá sau sửa chữa (Work Order Feedback)
// =========================
//
// Nguồn: `work-order-service/WorkOrderFeedbackController`.
//
// Cả 3 endpoint này dùng `@PreAuthorize("isAuthenticated()")` (hoặc
// `permitAll()` cho summary) — KHÔNG cần authority riêng. Backend tự ánh xạ
// `userId` trong JWT → customer id qua customer-vehicle-service, rồi chỉ cho
// khách đánh giá đúng phiếu của mình.

export interface CreateWorkOrderFeedbackRequest {
  /** 1..5. */
  rating: number;
  /** Tối đa 1000 ký tự. */
  comment?: string | null;
}

export const workOrderFeedbackApi = {
  /**
   * Các Work Order của chính khách đã CLOSED mà CHƯA được đánh giá.
   *
   * Chỉ trả `workOrderId` + `workOrderCode` — không có thông tin xe/dịch vụ.
   * Trang 0-based, size tối đa 100.
   */
  getEligibleWorkOrders: async (
    page = 0,
    size = 20,
  ): Promise<FeedbackEligiblePageResponse> => {
    return client.requestPage<FeedbackEligiblePageResponse>(
      "/api/work-orders/me/feedback-eligible",
      { page, size },
    );
  },

  /**
   * Gửi đánh giá cho một Work Order đã CLOSED.
   *
   * Mỗi phiếu chỉ đánh giá được một lần → gọi lần hai sẽ nhận HTTP 409
   * (ErrorCode 6003 `WORK_ORDER_FEEDBACK_ALREADY_EXISTS`).
   */
  submitFeedback: async (
    workOrderId: string,
    data: CreateWorkOrderFeedbackRequest,
  ): Promise<WorkOrderFeedbackResponse> => {
    return client.request<WorkOrderFeedbackResponse>(
      `/api/work-orders/${workOrderId}/feedback`,
      { method: "POST", body: data },
    );
  },

  /**
   * Tổng hợp đánh giá công khai cho trang chủ.
   *
   * Endpoint này `permitAll()` — khách chưa đăng nhập vẫn xem được.
   * `limit` 1..10 (backend chặn ngoài khoảng này → 400).
   */
  getHomepageSummary: async (
    limit = 5,
  ): Promise<HomepageReviewSummaryResponse> => {
    return client.request<HomepageReviewSummaryResponse>(
      `/api/work-orders/reviews/summary?limit=${limit}`,
    );
  },
};

// ── API quản trị đánh giá ────────────────────────────────────────────────────
//
// Nguồn: `work-order-service/AdminWorkOrderFeedbackController`.
//
// Yêu cầu authority:
//  - `WORK_ORDER_FEEDBACK_READ`   → GET    /api/admin/work-order-feedbacks
//  - `WORK_ORDER_FEEDBACK_DELETE` → DELETE /api/admin/work-order-feedbacks/{id}
export const adminWorkOrderFeedbackApi = {
  /**
   * Danh sách đánh giá của toàn cửa hàng, có phân trang.
   *
   * @param rating lọc theo mức sao cụ thể (1..5). Bỏ qua để xem tất cả.
   */
  list: async (
    params: { rating?: number; page?: number; size?: number } = {},
  ): Promise<AdminFeedbackPageResponse> => {
    return client.requestPage<AdminFeedbackPageResponse>(
      "/api/admin/work-order-feedbacks",
      {
        rating: params.rating,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    );
  },

  /**
   * Xoá một đánh giá (vd: nhận xét vi phạm).
   *
   * Xoá xong thì khách có thể đánh giá lại phiếu sửa chữa đó.
   */
  delete: async (feedbackId: string): Promise<void> => {
    await client.request<void>(`/api/admin/work-order-feedbacks/${feedbackId}`, {
      method: "DELETE",
    });
  },
};
