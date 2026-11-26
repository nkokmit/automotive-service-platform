/**
 * Endpoint client cho `notification-service` — thông báo trong ứng dụng.
 *
 * Yêu cầu authority:
 *  - (không yêu cầu authority riêng) cho /api/notifications/me, /me/unread-count,
 *    /{id}/read, /me/read-all — mọi user đã đăng nhập đều dùng được.
 *  - `NOTIFICATION_SEND`           cho POST /api/notifications/send
 *  - `NOTIFICATION_TEMPLATE_READ`  cho GET  /api/notification-templates
 *  - `NOTIFICATION_TEMPLATE_WRITE` cho PUT  /api/notification-templates/{id}
 *
 * Lưu ý về hợp đồng API:
 *  - Phân trang của notification-service dùng shape `PageResponse` RIÊNG
 *    (`content` + `first`/`last`) — khác `PageResponse` chung trong `api/types.ts`
 *    (`items` + `hasNext`/`hasPrevious`).
 *  - `GET /api/notifications/stream` là SSE. `EventSource` của trình duyệt KHÔNG
 *    gửi được header `Authorization` → phải dùng `fetch` + `ReadableStream`
 *    (xem `notificationStream.ts`).
 */
import client from "../client";
import type {
  NotificationPageResponse,
  NotificationResponse,
  NotificationTemplatePageResponse,
  NotificationTemplateResponse,
  SendNotificationRequest,
  UnreadCountResponse,
  UpdateNotificationTemplateRequest,
} from "../types";

export interface ListNotificationsParams {
  /** `true` = chỉ lấy thông báo đã đọc, `false` = chỉ lấy chưa đọc. */
  isRead?: boolean;
  category?: string;
  page?: number;
  size?: number;
}

export const notificationApi = {
  /** Danh sách thông báo của chính người đang đăng nhập. */
  listMyNotifications: async (
    params: ListNotificationsParams = {},
  ): Promise<NotificationPageResponse> => {
    return client.requestPage<NotificationPageResponse>("/api/notifications/me", {
      isRead: params.isRead,
      category: params.category,
      page: params.page ?? 0,
      size: params.size ?? 20,
    });
  },

  /** Số thông báo chưa đọc — dùng cho badge trên icon chuông. */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return client.request<UnreadCountResponse>("/api/notifications/me/unread-count");
  },

  /** Đánh dấu một thông báo đã đọc. */
  markRead: async (id: string): Promise<NotificationResponse> => {
    return client.request<NotificationResponse>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  /** Đánh dấu toàn bộ thông báo đã đọc — trả về số thông báo được đánh dấu. */
  markAllRead: async (): Promise<number> => {
    return client.request<number>("/api/notifications/me/read-all", {
      method: "PATCH",
    });
  },

  /** Gửi thông báo thủ công. Cần authority `NOTIFICATION_SEND`. */
  send: async (
    data: SendNotificationRequest,
  ): Promise<NotificationResponse> => {
    return client.request<NotificationResponse>("/api/notifications/send", {
      method: "POST",
      body: data,
    });
  },

  /** Danh sách template thông báo. Cần `NOTIFICATION_TEMPLATE_READ`. */
  listTemplates: async (
    params: { page?: number; size?: number } = {},
  ): Promise<NotificationTemplatePageResponse> => {
    return client.requestPage<NotificationTemplatePageResponse>(
      "/api/notification-templates",
      { page: params.page ?? 0, size: params.size ?? 50 },
    );
  },

  /** Cập nhật template. Cần `NOTIFICATION_TEMPLATE_WRITE`. */
  updateTemplate: async (
    id: string,
    data: UpdateNotificationTemplateRequest,
  ): Promise<NotificationTemplateResponse> => {
    return client.request<NotificationTemplateResponse>(
      `/api/notification-templates/${id}`,
      { method: "PUT", body: data },
    );
  },
};
