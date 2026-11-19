/**
 * Endpoint client cho `work-order-service` — Phiếu sửa chữa (Work Order).
 *
 * Yêu cầu authority: `WORK_ORDER_READ` cho các API GET.
 * Role CUSTOMER không có quyền này → chỉ dùng ở khu vực admin (xưởng).
 */
import client from "../client";
import type {
  WorkOrderPageResponse,
  WorkOrderResponse,
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
};
