/**
 * Endpoint client cho module Báo cáo & Thống kê (`billing-service`).
 *
 * Yêu cầu authority: `REPORT_READ` cho TẤT CẢ endpoint (module chỉ đọc).
 *
 * Hợp đồng API:
 *  - Khoảng lọc luôn là **[from, to)** (nửa mở) — không truyền `to` nghĩa là
 *    "hết ngày mai" nên "tháng này" luôn bao gồm cả ngày đang chạy.
 *  - `from`/`to` là ISO-8601 instant (VD `2026-11-01T00:00:00Z`).
 *  - `granularity` mặc định `MONTH`; `itemType` bỏ trống = lấy cả dịch vụ
 *    lẫn phụ tùng.
 */
import client from "../client";
import type {
  PaymentBreakdownResponse,
  ReportGranularity,
  ReportItemType,
  RevenueByCategoryResponse,
  RevenueByItemResponse,
  RevenueOverviewResponse,
  RevenuePeriodResponse,
} from "../types";

export interface ReportRangeParams {
  /** ISO-8601 instant — bắt đầu kỳ (bao gồm). */
  from?: string;
  /** ISO-8601 instant — kết thúc kỳ (không bao gồm). */
  to?: string;
}

/** Bỏ các tham số rỗng để không gửi `?from=` rỗng lên server. */
function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.append(key, String(value));
    }
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export const reportApi = {
  /**
   * Tổng quan doanh thu trong kỳ: gross/net, đã thu, đã hoàn, công nợ,
   * giá trị đơn trung bình, tỉ lệ công lao động – phụ tùng.
   */
  overview: async (params: ReportRangeParams = {}) => {
    return client.request<RevenueOverviewResponse>(
      `/api/reports/revenue/overview${toQuery({
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  /** Chuỗi thời gian doanh thu — dùng để vẽ biểu đồ xu hướng. */
  revenueByPeriod: async (
    params: ReportRangeParams & { granularity?: ReportGranularity } = {},
  ) => {
    return client.request<RevenuePeriodResponse[]>(
      `/api/reports/revenue/by-period${toQuery({
        from: params.from,
        to: params.to,
        granularity: params.granularity,
      })}`,
    );
  },

  /** Doanh thu theo từng dịch vụ / phụ tùng. */
  revenueByService: async (
    params: ReportRangeParams & { itemType?: ReportItemType } = {},
  ) => {
    return client.request<RevenueByItemResponse[]>(
      `/api/reports/revenue/by-service${toQuery({
        from: params.from,
        to: params.to,
        itemType: params.itemType,
      })}`,
    );
  },

  /** Doanh thu theo nhóm dịch vụ (nhóm lấy từ inventory-service). */
  revenueByCategory: async (params: ReportRangeParams = {}) => {
    return client.request<RevenueByCategoryResponse[]>(
      `/api/reports/revenue/by-category${toQuery({
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  /** Phân bổ thanh toán theo phương thức (tiền mặt / chuyển khoản / thẻ). */
  paymentBreakdown: async (params: ReportRangeParams = {}) => {
    return client.request<PaymentBreakdownResponse[]>(
      `/api/reports/payments/breakdown${toQuery({
        from: params.from,
        to: params.to,
      })}`,
    );
  },
};
