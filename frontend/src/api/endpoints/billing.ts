/**
 * Endpoint client cho `billing-service` — hóa đơn & thanh toán.
 *
 * Yêu cầu authority:
 *  - `INVOICE_READ`  → GET hóa đơn
 *  - `INVOICE_WRITE` → tạo hóa đơn từ work order, cập nhật chiết khấu, huỷ hóa đơn
 *  - `PAYMENT_WRITE` → ghi nhận thanh toán
 *  - `PAYMENT_REFUND`→ hoàn tiền
 *
 * Lưu ý về hợp đồng API:
 *  - `InvoicePageResponse` khác `PageResponse` của Spring Data — không có
 *    `hasNext`/`hasPrevious`, dùng type riêng trong `api/types.ts`.
 *  - Mọi tiền đều là `BigDecimal` → frontend nhận `number`.
 *  - `POST /api/payments` là **idempotent** theo `idempotencyKey` (UUID bắt buộc).
 *  - `POST /api/invoices/{id}/void` nhận body **optional** — không gửi body cũng hợp lệ.
 */
import client, { isApiError } from "../client";
import type {
  InvoicePageResponse,
  InvoiceResponse,
  InvoiceStatus,
  PaymentMethod,
  PaymentResponse,
} from "../types";

export const BILLING_SERVER_ERROR =
  "Máy chủ billing gặp sự cố ngoài dự kiến. Vui lòng thử lại hoặc liên hệ quản trị viên.";

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

  /**
   * Tạo hóa đơn từ một Work Order.
   *
   * <p>Backend yêu cầu Work Order ở trạng thái `PENDING_PAYMENT` và có ít nhất
   * một dòng dịch vụ `COMPLETED` hoặc phụ tùng đã cấp (`issuedQuantity > 0`).
   *
   * <p>**Idempotent**: nếu Work Order đã có hóa đơn thì backend trả lại hóa đơn
   * cũ thay vì tạo mới.
   */
  createFromWorkOrder: async (
    workOrderId: string,
  ): Promise<InvoiceResponse> => {
    return client.request<InvoiceResponse>(
      `/api/invoices/from-work-order/${workOrderId}`,
      { method: "POST" },
    );
  },

  /**
   * Cập nhật chiết khấu của hóa đơn.
   *
   * <p>Chỉ áp dụng được khi hóa đơn còn `UNPAID` **và** chưa có thanh toán nào
   * (`paidAmount == 0`). Chiết khấu tối đa bằng `subtotalLabor + subtotalParts +
   * taxAmount`.
   */
  updateDiscount: async (
    id: string,
    discountAmount: number,
    note?: string | null,
  ): Promise<InvoiceResponse> => {
    return client.request<InvoiceResponse>(`/api/invoices/${id}/discount`, {
      method: "PATCH",
      body: {
        discountAmount,
        note: note ?? null,
      },
    });
  },

  /**
   * Huỷ hóa đơn.
   *
   * <p>Chỉ huỷ được khi hóa đơn **chưa có thanh toán** (`paidAmount == 0`).
   * Huỷ hóa đơn đã có thanh toán sẽ bị backend từ chối — phải hoàn tiền trước.
   */
  voidInvoice: async (
    id: string,
    reason?: string | null,
  ): Promise<InvoiceResponse> => {
    return client.request<InvoiceResponse>(`/api/invoices/${id}/void`, {
      method: "POST",
      body: { reason: reason ?? null },
    });
  },
};

// =========================
// Thanh toán
// =========================

export interface PaymentCreateRequest {
  invoiceId: string;
  /** UUID bắt buộc — backend dùng làm khoá idempotency. */
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  /** Số tiền > 0, không được vượt quá số dư còn lại của hóa đơn. */
  amount: number;
  /** Mã giao dịch của cổng thanh toán / tài khoản nhận tiền. */
  transactionRef?: string | null;
  note?: string | null;
}

export const paymentApi = {
  /**
   * Ghi nhận thanh toán.
   *
   * <p>Idempotent theo `idempotencyKey` — gọi lại với cùng key sẽ trả về đúng
   * giao dịch cũ, không tạo thanh toán mới.
   *
   * <p>Backend tự cập nhật trạng thái hóa đơn:
   *  - trả đủ → `PAID`
   *  - trả một phần → `PARTIALLY_PAID`
   */
  recordPayment: async (
    data: PaymentCreateRequest,
  ): Promise<PaymentResponse> => {
    return client.request<PaymentResponse>("/api/payments", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Hoàn tiền một giao dịch thanh toán.
   *
   * <p>Chỉ hoàn được giao dịch đang ở trạng thái `SUCCEEDED`. Sau khi hoàn,
   * hóa đơn trở về `UNPAID` (nếu không còn thanh toán hiệu lực nào) hoặc
   * `PARTIALLY_PAID`.
   */
  refundPayment: async (
    id: string,
    reason?: string | null,
  ): Promise<PaymentResponse> => {
    return client.request<PaymentResponse>(`/api/payments/${id}/refund`, {
      method: "POST",
      body: { reason: reason ?? null },
    });
  },
};

/**
 * Dịch lỗi từ `billing-service` thành thông điệp dễ hiểu.
 *
 * Lưu ý: 2 lỗi backend đã được sửa (đọc sai claim JWT và ghi `outbox_events`),
 * nên 500 không còn là trạng thái thường gặp ở các luồng ghi. Nếu vẫn gặp 500 thì
 * đây là sự cố chưa xử lý — hiển thị thông báo chung chứ không đổ lỗi cho người dùng.
 */
export function describeBillingError(err: unknown): string {
  if (isApiError(err) && err.status === 500) {
    return BILLING_SERVER_ERROR;
  }
  if (err instanceof Error) return err.message;
  return "Thao tác thanh toán không thành công";
}
