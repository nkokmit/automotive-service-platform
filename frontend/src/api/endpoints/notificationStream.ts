/**
 * SSE client cho `GET /api/notifications/stream`.
 */
import { getAccessToken } from "../session";
import type { NotificationSsePayload } from "../types";

export interface NotificationStreamHandlers {
  onNotification: (payload: NotificationSsePayload) => void;
  onError?: (error: unknown) => void;
  onOpen?: () => void;
}

export interface NotificationStreamHandle {
  close: () => void;
}

/**
 * Tách buffer SSE thành các event + phần dư chưa hoàn chỉnh.
 *
 * QUAN TRỌNG: không được lọc bỏ phần tử rỗng ở đây. Phần tử cuối cùng luôn
 * là "phần dư" (chưa có dấu phân cách `\n\n` → có thể là event chưa hoàn
 * chỉnh, hoặc rỗng nếu event trước vừa kết thúc đúng). Nếu lọc trước rồi
 * `pop()` thì sẽ lấy mất chính event hoàn chỉnh cuối cùng → mất event.
 *
 * @returns `[events, remainder]` — events là các block hoàn chỉnh, remainder là
 *          chuỗi chưa hoàn chỉnh cần nối vào chunk tiếp theo.
 */
function splitEvents(buffer: string): [string[], string] {
  const parts = buffer.split(/\r?\n\r?\n/);
  const remainder = parts.pop() ?? "";
  const events = parts.filter((block) => block.trim().length > 0);
  return [events, remainder];
}

function extractData(block: string): string | null {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return dataLines.join("\n");
}

/**
 * Mở stream SSE tới `GET /api/notifications/stream`.
 *
 * Vì sao không dùng `EventSource`?
 * `EventSource` của trình duyệt KHÔNG cho phép set header `Authorization`,
 * mà endpoint này yêu cầu Bearer token → phải tự đọc `ReadableStream` từ
 * `fetch` (đã dùng pattern này ở các module khác của dự án).
 *
 * Backend gửi event tên `notification` với payload JSON là
 * `NotificationSsePayload` (xem `SseEmitterRegistry.publish`).
 */
export function openNotificationStream(
  handlers: NotificationStreamHandlers,
): NotificationStreamHandle {
  const controller = new AbortController();
  let closed = false;

  const run = async () => {
    const token = getAccessToken();
    if (!token) {
      handlers.onError?.(new Error("Chưa đăng nhập — không thể mở stream thông báo"));
      return;
    }

    // Báo "đã kết nối" TRƯỚC khi `await fetch` xong.
    //
    // Lý do: Spring `SseEmitter` chỉ flush HTTP headers khi có event đầu tiên
    // → promise của `fetch` chỉ resolve SAU event đầu tiên. Nếu chờ `fetch`
    // xong mới báo `onOpen` thì chỉ báo "Trực tiếp" sẽ không bao giờ hiện, và
    // ta cũng không phân biệt được "đang kết nối" với "đã hỏng".
    //
    // Nếu kết nối thật sự hỏng (401/5xx/mạng lỗi) thì `onError` sẽ được gọi
    // và tầng trên tự chuyển sang polling.
    handlers.onOpen?.();

    try {
      const res = await fetch("/api/notifications/stream", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        handlers.onError?.(new Error(`Mở stream thông báo thất bại (HTTP ${res.status})`));
        return;
      }
      if (!res.body) {
        handlers.onError?.(new Error("Trình duyệt không hỗ trợ đọc stream"));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          // Stream bị đóng (hết hạn / server restart / mạng cắt). Báo lỗi để
          // tầng trên retry — nếu không, stream sẽ chết âm thầm và badge không
          // còn cập nhật nữa.
          if (!closed) {
            handlers.onError?.(new Error("Luồng thông báo đã bị đóng"));
          }
          break;
        }
        if (closed) break;

        buffer += decoder.decode(value, { stream: true });

        const [blocks, remainder] = splitEvents(buffer);
        // Giữ lại phần cuối chưa hoàn chỉnh (thiếu dấu phân cách block).
        buffer = remainder;

        for (const block of blocks) {
          const data = extractData(block);
          if (!data) continue;
          try {
            handlers.onNotification(JSON.parse(data) as NotificationSsePayload);
          } catch {
            // Payload hỏng — bỏ qua event này, không làm sập cả stream.
          }
        }
      }
    } catch (err) {
      if (!closed) handlers.onError?.(err);
    }
  };

  void run();

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}
