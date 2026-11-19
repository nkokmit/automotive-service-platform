/**
 * Endpoint client cho `billing-service` — hóa đơn & thanh toán.
 *
 * Yêu cầu authority: `INVOICE_READ` cho các API GET.
 * - `GET /api/invoices`     → tra cứu toàn hệ thống (ADMIN/MANAGER/CASHIER).
 * - `GET /api/invoices/me`  → lịch sử hóa đơn của chính khách đang đăng nhập.
 *
 * Lưu ý: `InvoicePageResponse` khác `PageResponse` của Spring Data — không có
 * `hasNext`/`hasPrevious`, nên dùng type riêng trong `api/types.ts`.
 */
import client from "../client";
import type {
  InvoicePageResponse,
  InvoiceResponse,
  InvoiceStatus,
} from "../types";

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  customerId?: string;
  /** ISO-8601 instant. */
  from?: string;
  /** ISO-8601 instant. */
  to?: string;
  page?: number;
  size?: number;
}

export const billingApi = {
  /** Tra cứu hóa đơn toàn hệ thống. */
  listInvoices: async (
    params: ListInvoicesParams = {},
  ): Promise<InvoicePageResponse> => {
    return client.requestPage<InvoicePageResponse>("/api/invoices", {
      status: params.status,
      customerId: params.customerId,
      from: params.from,
      to: params.to,
      page: params.page ?? 0,
      size: params.size ?? 20,
    });
  },

  /** Lịch sử hóa đơn của chính khách hàng đang đăng nhập. */
  getMyInvoices: async (
    page = 0,
    size = 20,
  ): Promise<InvoicePageResponse> => {
    return client.requestPage<InvoicePageResponse>("/api/invoices/me", {
      page,
      size,
    });
  },

  /** Chi tiết hóa đơn (kèm dòng hàng và lịch sử thanh toán). */
  getInvoice: async (id: string): Promise<InvoiceResponse> => {
    return client.request<InvoiceResponse>(`/api/invoices/${id}`);
  },
};
