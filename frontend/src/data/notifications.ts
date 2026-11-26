/**
 * Hook dùng chung cho hệ thống thông báo.
 *
 * Cung cấp:
 *  - `unreadCount`   — số thông báo chưa đọc (badge trên icon chuông)
 *  - `items`         — danh sách thông báo gần đây
 *  - `loading` / `error`
 *  - `refresh()`     — tải lại danh sách + số chưa đọc
 *  - `markRead(id)`  — đánh dấu 1 thông báo đã đọc
 *  - `markAllRead()` — đánh dấu tất cả đã đọc
 *
 * Nguồn dữ liệu:
 *  - `GET /api/notifications/me` + `GET /api/notifications/me/unread-count`
 *  - `GET /api/notifications/stream` (SSE) để nhận thông báo real-time.
 *
 * Về SSE: `EventSource` không gửi được header `Authorization` nên phải dùng
 * `fetch` + `ReadableStream` (xem `api/endpoints/notificationStream.ts`).
 * Nếu stream lỗi (mạng chập chờn, proxy ngắt) → tự rơi về polling 30s để
 * badge vẫn cập nhật, và thử mở lại stream sau 60s.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationApi } from "../api/endpoints/notification";
import {
  openNotificationStream,
  type NotificationStreamHandle,
} from "../api/endpoints/notificationStream";
import { isAuthError } from "../api/client";
import { TOKEN_EVENT, getAccessToken } from "../api/session";
import type { NotificationResponse } from "../api/types";

/** Chu kỳ polling fallback (ms) — chỉ dùng khi SSE không mở được. */
const POLL_INTERVAL_MS = 30_000;
/** Thời gian chờ trước khi thử mở lại SSE sau khi stream bị lỗi. */
const STREAM_RETRY_DELAY_MS = 60_000;

export interface UseNotificationsResult {
  items: NotificationResponse[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** true khi SSE đang mở (badge sẽ cập nhật tức thì). */
  live: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<number>;
}

export function useNotifications(
  options: { enabled?: boolean; limit?: number } = {},
): UseNotificationsResult {
  const { enabled = true, limit = 10 } = options;

  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const streamRef = useRef<NotificationStreamHandle | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !getAccessToken()) return;
    setLoading(true);
    try {
      const [page, count] = await Promise.all([
        notificationApi.listMyNotifications({ size: limit }),
        notificationApi.getUnreadCount(),
      ]);
      setItems(page.content ?? []);
      setUnreadCount(count.unreadCount ?? 0);
      setError(null);
    } catch (err) {
      if (isAuthError(err)) {
        setItems([]);
        setUnreadCount(0);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách thông báo",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, limit]);

  // ── SSE: mở stream, tự polling fallback khi lỗi ──────────────────────────
  useEffect(() => {
    if (!enabled || !getAccessToken()) return;

    let disposed = false;

    const stopPolling = () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const startPolling = () => {
      if (disposed) return;
      setLive(false);
      if (pollTimerRef.current !== null) return;
      pollTimerRef.current = window.setInterval(() => {
        void load();
      }, POLL_INTERVAL_MS);
    };

    const scheduleRetry = () => {
      if (disposed) return;
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        if (!disposed) open();
      }, STREAM_RETRY_DELAY_MS);
    };

    const open = () => {
      if (disposed) return;
      streamRef.current?.close();
      streamRef.current = openNotificationStream({
        onOpen: () => {
          if (disposed) return;
          // SSE đã lên → tắt polling fallback để không gọi API thừa.
          stopPolling();
          setLive(true);
        },
        onNotification: () => {
          // Thông báo mới tới → tải lại danh sách + badge.
          void load();
        },
        onError: () => {
          if (disposed) return;
          setLive(false);
          startPolling();
          scheduleRetry();
        },
      });
    };

    open();

    return () => {
      disposed = true;
      streamRef.current?.close();
      streamRef.current = null;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, load]);

  // Đăng nhập / đăng xuất / refresh token → nạp lại danh sách.
  useEffect(() => {
    if (!enabled) return;
    void load();
    const onToken = () => {
      void load();
    };
    window.addEventListener(TOKEN_EVENT, onToken);
    return () => window.removeEventListener(TOKEN_EVENT, onToken);
  }, [enabled, load]);

  const markRead = useCallback(async (id: string) => {
    // Cập nhật optimistically để UI phản hồi tức thì.
    // CHỈ giảm badge khi thông báo thực sự chưa đọc — nếu đã đọc rồi thì
    // badge không đổi, tránh đếm sai.
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id || n.isRead) return n;
        wasUnread = true;
        return { ...n, isRead: true, readAt: new Date().toISOString() };
      }),
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationApi.markRead(id);
    } catch (err) {
      await load();
      throw err;
    }
  }, [load]);

  const markAllRead = useCallback(async (): Promise<number> => {
    const previous = items;
    setItems((prev) =>
      prev.map((n) =>
        n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() },
      ),
    );
    setUnreadCount(0);
    try {
      return await notificationApi.markAllRead();
    } catch (err) {
      setItems(previous);
      await load();
      throw err;
    }
  }, [items, load]);

  return {
    items,
    unreadCount,
    loading,
    error,
    live,
    refresh: load,
    markRead,
    markAllRead,
  };
}
